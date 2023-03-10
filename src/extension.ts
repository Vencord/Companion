import { commands, ExtensionContext, languages, window as vscWindow } from "vscode";
import { FindData, PatchData } from "./helpers";
import { PatchCodeLensProvider } from "./PatchCodeLensProvider";
import { WebpackCodeLensProvider } from "./WebpackCodeLensProvider";
import { sendToSockets, startWss } from "./wss";

export function activate(context: ExtensionContext) {
	startWss();

	context.subscriptions.push(
		languages.registerCodeLensProvider({ pattern: "**/plugins/{*.ts,*.tsx,**/index.ts,**/index.tsx}" }, PatchCodeLensProvider),

		languages.registerCodeLensProvider({ language: "typescript" }, WebpackCodeLensProvider),
		languages.registerCodeLensProvider({ language: "typescriptreact" }, WebpackCodeLensProvider),

		commands.registerCommand("vencord-companion.testPatch", async (patch: PatchData) => {
			try {
				await sendToSockets({ type: "testPatch", data: patch });
				vscWindow.showInformationMessage("Patch OK!");
			} catch (err) {
				vscWindow.showErrorMessage("Patch failed: ", {
					detail: String(err)
				});
			}
		}),

		commands.registerCommand("vencord-companion.testFind", async (find: FindData) => {
			try {
				await sendToSockets({ type: "testFind", data: find });
				vscWindow.showInformationMessage("Find OK!");
			} catch (err) {
				vscWindow.showErrorMessage("Find bad: ", {
					detail: String(err)
				});
			}
		}),
	);
}

export function deactivate() {
	//
}
