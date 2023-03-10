import { basename } from "path";
import { CompilerOptions, createPrinter, EmitHint, findConfigFile, isArrowFunction, isFunctionExpression, isIdentifier, isRegularExpressionLiteral, isStringLiteral, Node, ObjectLiteralElementLike, parseJsonConfigFileContent, readConfigFile, sys, transpileModule } from "typescript";
import { TextDocument } from "vscode";

export function hasName(node: ObjectLiteralElementLike, name: string) {
    return node.name && isIdentifier(node.name) && node.name.text === name;
}

export interface ParseResult {
    type: string;
    value: unknown;
}

export interface PatchData {
    find: string;
    replacement: Record<"match" | "replace", ParseResult>[];
}

export interface FindData {
    type: string;
    args: string[];
}

export function isNotNull<T>(value: T): value is Exclude<T, null | undefined> {
    return value != null;
}

export function tryParseFunction(document: TextDocument, node: Node) {
    if (!isArrowFunction(node) && !isFunctionExpression(node))
        return null;

    const code = createPrinter().printNode(EmitHint.Expression, node, node.getSourceFile());

    let compilerOptions: CompilerOptions = {};

    const tsConfigPath = findConfigFile(document.fileName, sys.fileExists);
    if (tsConfigPath) {
        const configFile = readConfigFile(tsConfigPath, sys.readFile);
        compilerOptions = parseJsonConfigFileContent(configFile.config, sys, basename(tsConfigPath)).options;
    }

    const res = transpileModule(code, { compilerOptions });
    if (res.diagnostics && res.diagnostics.length > 0)
        return null;

    return {
        type: "function",
        value: res.outputText
    };
}

export function tryParseStringLiteral(node: Node) {
    if (!isStringLiteral(node)) return null;

    return {
        type: "string",
        value: node.text
    };
}

export function tryParseRegularExpressionLiteral(node: Node) {
    if (!isRegularExpressionLiteral(node))
        return null;

    const m = node.text.match(/^\/(.+?)\/(.*?)$/);
    return m && {
        type: "regex",
        value: {
            pattern: m[1],
            flags: m[2]
        }
    };
}
