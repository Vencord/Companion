import { basename } from "path";
import * as ts from "typescript";
import * as vscode from 'vscode';

interface ParseResult {
	type: string;
	value: unknown;
}

function hasName(node: ts.ObjectLiteralElementLike, name: string) {
	return node.name && ts.isIdentifier(node.name) && node.name.text === name;
}

function parseFind(patch: ts.ObjectLiteralExpression) {
	const find = patch.properties.find(p => hasName(p, "find"));
	if (!find || !ts.isPropertyAssignment(find) || !ts.isStringLiteral(find.initializer)) return null;

	return find.initializer.text;
}

function parseMatch(node: ts.Expression): ParseResult | null {
	if (ts.isStringLiteral(node)) return {
		type: "string",
		value: node.text
	};
	if (ts.isRegularExpressionLiteral(node)) {
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

function parseReplace(document: vscode.TextDocument, node: ts.Expression): ParseResult | null {
	if (ts.isStringLiteral(node)) return {
		type: "string",
		value: node.text
	};
	if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
		const code = ts.createPrinter().printNode(ts.EmitHint.Expression, node, node.getSourceFile());

		let compilerOptions: ts.CompilerOptions = {};

		const tsConfigPath = ts.findConfigFile(document.fileName, ts.sys.fileExists);
		if (tsConfigPath) {
			const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
			compilerOptions = ts.parseJsonConfigFileContent(configFile.config, ts.sys, basename(tsConfigPath)).options;
		}

		const res = ts.transpileModule(code, { compilerOptions });
		if (res.diagnostics && res.diagnostics.length > 0) return null;

		return {
			type: "function",
			value: res.outputText
		};
	}
	return null;
}

function parseReplacement(document: vscode.TextDocument, patch: ts.ObjectLiteralExpression) {
	const replacementObj = patch.properties.find(p => hasName(p, "replacement"));

	if (!replacementObj || !ts.isPropertyAssignment(replacementObj)) return null;

	const replacement = replacementObj.initializer;
	if (!ts.isObjectLiteralExpression(replacement)) return null;

	const match = replacement.properties.find(p => hasName(p, "match"));
	const replace = replacement.properties.find(p => hasName(p, "replace"));

	if (!match || !replace || !ts.isPropertyAssignment(match) || !ts.isPropertyAssignment(replace)) return null;

	const matchValue = parseMatch(match.initializer);
	if (!matchValue) return null;

	const replaceValue = parseReplace(document, replace.initializer);
	if (!replaceValue) return null;

	return {
		match: matchValue,
		replace: replaceValue
	};
}

function parsePatch(document: vscode.TextDocument, patch: ts.ObjectLiteralExpression) {
	const find = parseFind(patch);
	const replacement = parseReplacement(document, patch);

	if (!find || !replacement) return null;

	return {
		find,
		replacement
	};
}

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.languages.registerCodeLensProvider({ pattern: "**/plugins/{*.ts,*.tsx,**/index.ts,**/index.tsx}" }, {
		provideCodeLenses(document, token) {
			const file = ts.createSourceFile(document.fileName, document.getText(), ts.ScriptTarget.Latest);
			const children = file.getChildAt(0).getChildren();

			for (const node of children) {
				if (!ts.isExportAssignment(node) || !ts.isCallExpression(node.expression)) continue;

				const callExpr = node.expression;
				if (!ts.isIdentifier(callExpr.expression) || callExpr.expression.text !== "definePlugin") continue;

				const pluginObj = node.expression.arguments[0];
				if (!ts.isObjectLiteralExpression(pluginObj)) return [];

				const patchesObj = pluginObj.properties.find(p => hasName(p, "patches"));
				if (!patchesObj) return [];

				const patchesArray = ts.isPropertyAssignment(patchesObj) ? patchesObj.initializer : patchesObj;
				if (!ts.isArrayLiteralExpression(patchesArray)) return [];

				const lenses = [] as vscode.CodeLens[];
				for (const patch of patchesArray.elements) {
					if (!ts.isObjectLiteralExpression(patch)) continue;

					const data = parsePatch(document, patch);
					if (!data) continue;

					const range = new vscode.Range(document.positionAt(patch.pos), document.positionAt(patch.end));
					const lens = new vscode.CodeLens(range, {
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
		},
	});

	context.subscriptions.push(disposable);

	context.subscriptions.push(vscode.commands.registerCommand("vencord-companion.testPatch", (patch: {
		find: string;
		replacement: Record<"match" | "replace", ParseResult>;
	}) => {
		console.log(patch);
		vscode.window.showInformationMessage("Test Patch");
	}));
}

export function deactivate() {
	//
}
