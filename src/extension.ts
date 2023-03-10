import { commands, ExtensionContext, languages, window as vscWindow } from "vscode";
import { FindData, PatchData } from "./helpers";
import { PatchCodeLensProvider } from "./PatchCodeLensProvider";
import { WebpackCodeLensProvider } from "./WebpackCodeLensProvider";

export function activate(context: ExtensionContext) {
	context.subscriptions.push(
		languages.registerCodeLensProvider({ pattern: "**/plugins/{*.ts,*.tsx,**/index.ts,**/index.tsx}" }, PatchCodeLensProvider),

		languages.registerCodeLensProvider({ language: "typescript" }, WebpackCodeLensProvider),
		languages.registerCodeLensProvider({ language: "typescriptreact" }, WebpackCodeLensProvider),

		commands.registerCommand("vencord-companion.testPatch", (patch: PatchData) => {
			console.log(patch);
			vscWindow.showInformationMessage("Test Patch");
		}),

		commands.registerCommand("vencord-companion.testFind", (find: FindData) => {
			console.log(find);
			vscWindow.showInformationMessage("Test Find");
		}),
	);
}

export function deactivate() {
	//
}
