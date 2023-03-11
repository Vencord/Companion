import { commands, ExtensionContext, languages, window as vscWindow } from "vscode";
import { PatchCodeLensProvider } from "./PatchCodeLensProvider";
import { FindData, Mod, PatchData } from "./shared";
import { WebpackCodeLensProvider } from "./WebpackCodeLensProvider";
import { sendToSockets, startWss } from "./wss";

export function activate(context: ExtensionContext) {
	startWss();

	context.subscriptions.push(
		languages.registerCodeLensProvider(
			{ pattern: "**/{plugins,userplugins}/{*.ts,*.tsx,**/index.ts,**/index.tsx}" },
			new PatchCodeLensProvider(Mod.VENCORD)
		),
		languages.registerCodeLensProvider(
			{ pattern: "**/plaintextPatches.{ts,tsx,js,jsx}" },
			new PatchCodeLensProvider(Mod.REPLUGGED)
		),

		languages.registerCodeLensProvider({ language: "typescript" }, WebpackCodeLensProvider),
		languages.registerCodeLensProvider({ language: "typescriptreact" }, WebpackCodeLensProvider),

		commands.registerCommand("vencord-companion.testPatch", async (patch: PatchData) => {
			try {
				await sendToSockets({ type: "testPatch", data: patch });
				vscWindow.showInformationMessage("Patch OK!");
			} catch (err) {
				vscWindow.showErrorMessage("Patch failed: " + String(err));
			}
		}),

		commands.registerCommand("vencord-companion.testFind", async (find: FindData) => {
			try {
				await sendToSockets({ type: "testFind", data: find });
				vscWindow.showInformationMessage("Find OK!");
			} catch (err) {
				vscWindow.showErrorMessage("Find bad: " + String(err));
			}
		}),
	);
}

export function deactivate() {
	//
}
