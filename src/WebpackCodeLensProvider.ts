import { createSourceFile, isCallExpression, Node, ScriptTarget } from "typescript";
import { CodeLens, CodeLensProvider, Range } from "vscode";

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
            if (isCallExpression(node) && finds.includes(node.expression.getText())) {
                const range = new Range(document.positionAt(node.pos), document.positionAt(node.end));
                lenses.push(new CodeLens(range, {
                    title: "Test Find",
                    command: "vencord-companion.testFind",
                }));
            }

            node.forEachChild(walk);
        }

        walk(sourceFile);

        return lenses;
    },
};
