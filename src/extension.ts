import { commands, ExtensionContext, languages, window as vscWindow } from "vscode";
import { ParseResult } from "./helpers";
import { PatchCodeLensProvider } from "./PatchCodeLensProvider";

export function activate(context: ExtensionContext) {
	context.subscriptions.push(
		languages.registerCodeLensProvider({ pattern: "**/plugins/{*.ts,*.tsx,**/index.ts,**/index.tsx}" }, PatchCodeLensProvider),

		commands.registerCommand("vencord-companion.testPatch", (patch: {
			find: string;
			replacement: Record<"match" | "replace", ParseResult>;
		}) => {
			console.log(patch);
			vscWindow.showInformationMessage("Test Patch");
		})
	);
}

export function deactivate() {
	//
}
