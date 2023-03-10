import { basename } from "path";
import {
    CompilerOptions, createPrinter, createSourceFile, EmitHint, Expression, findConfigFile, isArrayLiteralExpression, isArrowFunction, isCallExpression, isExportAssignment, isFunctionExpression, isIdentifier, isObjectLiteralExpression, isPropertyAssignment, isRegularExpressionLiteral, isStringLiteral, ObjectLiteralExpression, parseJsonConfigFileContent, readConfigFile, ScriptTarget, sys, transpileModule
} from "typescript";
import { CodeLens, CodeLensProvider, Range, TextDocument } from "vscode";
import { hasName, isNotNull, ParseResult, PatchData } from "./helpers";


function parseFind(patch: ObjectLiteralExpression) {
    const find = patch.properties.find(p => hasName(p, "find"));
    if (!find || !isPropertyAssignment(find) || !isStringLiteral(find.initializer)) return null;

    return find.initializer.text;
}

function parseMatch(node: Expression): ParseResult | null {
    if (isStringLiteral(node))
        return {
            type: "string",
            value: node.text
        };

    if (isRegularExpressionLiteral(node)) {
        const m = node.text.match(/^\/(.+?)\/(.*?)$/);
        return m && {
            type: "regex",
            value: {
                pattern: m[1],
                flags: m[2]
            }
        };
    }

    return null;
}

function parseReplace(document: TextDocument, node: Expression): ParseResult | null {
    if (isStringLiteral(node))
        return {
            type: "string",
            value: node.text
        };

    if (isArrowFunction(node) || isFunctionExpression(node)) {
        const code = createPrinter().printNode(EmitHint.Expression, node, node.getSourceFile());

        let compilerOptions: CompilerOptions = {};

        const tsConfigPath = findConfigFile(document.fileName, sys.fileExists);
        if (tsConfigPath) {
            const configFile = readConfigFile(tsConfigPath, sys.readFile);
            compilerOptions = parseJsonConfigFileContent(configFile.config, sys, basename(tsConfigPath)).options;
        }

        const res = transpileModule(code, { compilerOptions });
        if (res.diagnostics && res.diagnostics.length > 0) return null;

        return {
            type: "function",
            value: res.outputText
        };
    }

    return null;
}

function parseReplacement(document: TextDocument, patch: ObjectLiteralExpression) {
    const replacementObj = patch.properties.find(p => hasName(p, "replacement"));

    if (!replacementObj || !isPropertyAssignment(replacementObj)) return null;

    const replacement = replacementObj.initializer;

    const replacements = isArrayLiteralExpression(replacement) ? replacement.elements : [replacement];
    if (!replacements.every(isObjectLiteralExpression)) return null;

    return (replacements as ObjectLiteralExpression[]).map((r: ObjectLiteralExpression) => {
        const match = r.properties.find(p => hasName(p, "match"));
        const replace = r.properties.find(p => hasName(p, "replace"));

        if (!match || !replace || !isPropertyAssignment(match) || !isPropertyAssignment(replace)) return null;

        const matchValue = parseMatch(match.initializer);
        if (!matchValue) return null;

        const replaceValue = parseReplace(document, replace.initializer);
        if (!replaceValue) return null;

        return {
            match: matchValue,
            replace: replaceValue
        };
    }).filter(isNotNull);
}

function parsePatch(document: TextDocument, patch: ObjectLiteralExpression): PatchData | null {
    const find = parseFind(patch);
    const replacement = parseReplacement(document, patch);

    if (!find || !replacement) return null;

    return {
        find,
        replacement
    };
}

export const PatchCodeLensProvider: CodeLensProvider = {
    provideCodeLenses(document) {
        const text = document.getText();
        if (!text.includes("definePlugin") || !text.includes("patches:")) return [];

        const file = createSourceFile(document.fileName, text, ScriptTarget.Latest);
        const children = file.getChildAt(0).getChildren();

        for (const node of children) {
            if (!isExportAssignment(node) || !isCallExpression(node.expression)) continue;

            const callExpr = node.expression;
            if (!isIdentifier(callExpr.expression) || callExpr.expression.text !== "definePlugin") continue;

            const pluginObj = node.expression.arguments[0];
            if (!isObjectLiteralExpression(pluginObj)) return [];

            const patchesObj = pluginObj.properties.find(p => hasName(p, "patches"));
            if (!patchesObj) return [];

            const patchesArray = isPropertyAssignment(patchesObj) ? patchesObj.initializer : patchesObj;
            if (!isArrayLiteralExpression(patchesArray)) return [];

            const lenses = [] as CodeLens[];
            for (const patch of patchesArray.elements) {
                if (!isObjectLiteralExpression(patch)) continue;

                const data = parsePatch(document, patch);
                if (!data) continue;

                const range = new Range(document.positionAt(patch.properties.pos), document.positionAt(patch.properties.end));
                const lens = new CodeLens(range, {
                    title: "Test Patch",
                    command: "vencord-companion.testPatch",
                    arguments: [data],
                    tooltip: "Test Patch",
                });
                lenses.push(lens);
            }
            return lenses;
        }

        return [];
    }
};
