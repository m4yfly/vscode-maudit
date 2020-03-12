// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Logger } from "./logger";
import * as explorer from "./explorerTree";
import * as maudit from "./maudit";
import { MauditDiagnosticProvider } from "./mauditDiagnostics";

export let analysisRunning : boolean = false;
export let diagnosticsProvider : MauditDiagnosticProvider;
let ahelperExplorerTree: vscode.TreeView<explorer.ExplorerNode>;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

		// Set our panel to visible
		vscode.commands.executeCommand("setContext", "mauditCompatibleWorkspace", true);
	
		// Log our introductory message.
		Logger.log("\u2E3B Simple source code security audit helper by m4yfly \u2E3B");

		// Initialize Audit Helper
		await maudit.initialize();

		// Initialize the analysis explorer.
		let ahelperExplorerTreeProvider = new explorer.AHelperExplorer(context);
		ahelperExplorerTree = vscode.window.createTreeView("maudit-explorer", { treeDataProvider: ahelperExplorerTreeProvider });
   
		// Register our explorer button commands.
		context.subscriptions.push(vscode.commands.registerCommand("maudit.analyze", async () => {
			if(!analysisRunning) {
				analysisRunning = true;
				let progressOptions : vscode.ProgressOptions = {
					title: "Maduit: Please wait while analysis is performed...",
					location: vscode.ProgressLocation.Notification,
					cancellable: false
				};
				vscode.window.withProgress(progressOptions, async (progress, token) => {
					await maudit.analyze();
					await ahelperExplorerTreeProvider.refreshExplorer();
					analysisRunning = false;
				});
			}
		}));
		context.subscriptions.push(vscode.commands.registerCommand("maudit.clear", async () => {
			Logger.log("Clearing results...");
			await maudit.clear();
			await ahelperExplorerTreeProvider.refreshExplorer(); 
		}));		
		// Register our tree click commands.
		context.subscriptions.push(vscode.commands.registerCommand("maudit.clickedExplorerNode", async (node : explorer.ExplorerNode) => { 
			await ahelperExplorerTreeProvider.clickedNode(node); 
		}));


		// Register the diagnostics/code action provider
		let solidityDocumentSelector : vscode.DocumentSelector = { scheme: "file", language: "php" };
		diagnosticsProvider = new MauditDiagnosticProvider(context, vscode.languages.createDiagnosticCollection("Maduit"));
		context.subscriptions.push(vscode.languages.registerCodeActionsProvider(solidityDocumentSelector, diagnosticsProvider));


		vscode.workspace.onDidSaveTextDocument(async (e : vscode.TextDocument) => {
	
			// Any saved document should no longer be hidden in diagnostics
			diagnosticsProvider.hiddenFiles.delete(e.fileName);

			// Update source mapping status, and refresh trees + diagnostics
			await maudit.updateSourceMappingSyncStatus(false, e.fileName);
			await ahelperExplorerTreeProvider.refreshIconsForCheckResults();
			await ahelperExplorerTreeProvider.changeTreeEmitter.fire();
			await diagnosticsProvider.refreshDiagnostics();
		});

		// Add our document event handlers
		vscode.workspace.onDidChangeTextDocument(async (e : vscode.TextDocumentChangeEvent) => {
			// Hide all diagnostics in all dirty files.
			if(e.document.isDirty) {
				diagnosticsProvider.hiddenFiles.add(e.document.fileName);
			} else {
				diagnosticsProvider.hiddenFiles.delete(e.document.fileName);
			}
	
			// Refresh diagnostics
			await diagnosticsProvider.refreshDiagnostics();
		});
}

// this method is called when your extension is deactivated
export function deactivate() {}
