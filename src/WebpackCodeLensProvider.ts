import { createSourceFile, isCallExpression, Node, ScriptTarget } from "typescript";
import { CodeLens, CodeLensProvider, Range } from "vscode";
import { isNotNull, tryParseFunction, tryParseRegularExpressionLiteral, tryParseStringLiteral } from "./helpers";

const vencordImportRe = /import \{(.+?)\} from ['`"]@webpack(\/.+?)?['`"]/;
const repluggedImportRe = /(?:import \{[^}]*webpack[^}]*\} from ['"`]replugged["'`])|(import \{[^}]+\} from "\.[^"]*?modules\/webpack")/;

export const WebpackCodeLensProvider: CodeLensProvider = {
    provideCodeLenses(document) {
        const text = document.getText();

        let finds: string[];

        const match = vencordImportRe.exec(text);
        if (match) {
            finds = match[1].split(",")
                .map(s => s.trim())
                .filter(s => s.startsWith("find"));
        } else if (repluggedImportRe.test(text)) {
            finds = ["getModule", "getByProps", "getByValue", "getBySource"];
        } else {
            return [];
        }

        if (!finds.length) return [];

        const sourceFile = createSourceFile(document.fileName, text, ScriptTarget.Latest, true);
        const lenses = [] as CodeLens[];

        function walk(node: Node) {
            let type: string;
            if (isCallExpression(node) && finds.includes(type = node.expression.getText())) {
                const args = node.arguments.map(a => tryParseStringLiteral(a) ?? tryParseRegularExpressionLiteral(a) ?? tryParseFunction(document, a));

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
