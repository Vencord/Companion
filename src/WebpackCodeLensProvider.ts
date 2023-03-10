import { createSourceFile, isCallExpression, Node, ScriptTarget } from "typescript";
import { CodeLens, CodeLensProvider, Range } from "vscode";
import { isNotNull, tryParseFunction, tryParseStringLiteral } from "./helpers";

const importRe = /import {(.+?)} from ['`"]@webpack(\/.+?)?['`"]/;

export const WebpackCodeLensProvider: CodeLensProvider = {
    provideCodeLenses(document) {
        const text = document.getText();

        const match = importRe.exec(text);
        if (!match) return [];

        const finds = match[1].split(",")
            .map(s => s.trim())
            .filter(s => s.startsWith("find"));

        if (!finds.length) return [];

        const sourceFile = createSourceFile(document.fileName, text, ScriptTarget.Latest, true);
        const lenses = [] as CodeLens[];

        function walk(node: Node) {
            let type: string;
            if (isCallExpression(node) && finds.includes(type = node.expression.getText())) {
                const args = node.arguments.map(a => tryParseStringLiteral(a) ?? tryParseFunction(document, a));

                const range = new Range(document.positionAt(node.pos), document.positionAt(node.end));
                lenses.push(new CodeLens(range, {
                    title: "Test Find",
                    command: "vencord-companion.testFind",
                    arguments: [{ type, args: args.filter(isNotNull) }]
                }));
            }

            node.forEachChild(walk);
        }

        walk(sourceFile);

        return lenses;
    },
};
