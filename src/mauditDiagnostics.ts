import * as vscode from "vscode";
import * as maudit from "./maudit";
import * as mauditResults from "./mauditResults";

export class MauditDiagnosticProvider implements vscode.CodeActionProvider {
    public diagnosticCollection : vscode.DiagnosticCollection;
    private fileDiagnosticMap : Map<string, vscode.Diagnostic[]>;
    private fileResultMap : Map<string, mauditResults.MaduitResult[]>;
    public hiddenFiles : Set<string>;

    constructor(private context: vscode.ExtensionContext, diagnosticCollection : vscode.DiagnosticCollection) {
        // Set the diagnostic collection for this provider.
        this.diagnosticCollection = diagnosticCollection;

        // Initialize our list of files to ignore
        this.hiddenFiles = new Set<string>();

        // Initialize our file->result map to pair workspace results with diagnostics.
        this.fileDiagnosticMap = new Map<string, vscode.Diagnostic[]>();
        this.fileResultMap = new Map<string, mauditResults.MaduitResult[]>();
    } 

    public async refreshDiagnostics() {
        // Clear the diagnostic collection.
        this.diagnosticCollection.clear();

        // Clear our result and diagnostic maps
        this.fileDiagnosticMap.clear();
        this.fileResultMap.clear();

        // Loop through all workspace results
        for(let [workspaceFolder, workspaceResults] of maudit.globalResults) {
            for (let workspaceResult of workspaceResults) {

                // If the workspace result is out of sync, skip it
                if(!workspaceResult._ext_in_sync) {
                    continue;
                }

                // Obtain the range of our source mapping.
                let [startLine, startColumn, endLine, endColumn] = await mauditResults.getResultElementRange(workspaceResult);
                let resultRange : vscode.Range = new vscode.Range(startLine, startColumn, endLine, endColumn);

                // Determine the diagnostic severity
                let diagnosticSeverity : vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Information;

                // Create a diagnostic
                let diagnosticResult : vscode.Diagnostic = new vscode.Diagnostic(resultRange, workspaceResult.ruleDescription, diagnosticSeverity);

                // Obtain the absolute file path
                let filename_absolute = workspaceResult.matchFilePath;
                let filename_uri = vscode.Uri.file(filename_absolute);

                // If this is a hidden file, we skip it
                if(this.hiddenFiles.has(filename_uri.fsPath)) {
                    continue;
                }

                // If we don't have a diagnostic list for this file yet, create one.
                let diagnosticArray = this.fileDiagnosticMap.get(filename_uri.fsPath);
                let resultArray = this.fileResultMap.get(filename_uri.fsPath);
                if (!diagnosticArray || !resultArray) {
                    diagnosticArray = [];
                    resultArray = [];
                    this.fileDiagnosticMap.set(filename_uri.fsPath, diagnosticArray);
                    this.fileResultMap.set(filename_uri.fsPath, resultArray);
                }

                // Push the diagnostic and break out of looping elements to move onto the next result.
                diagnosticArray.push(diagnosticResult);
                resultArray.push(workspaceResult);
            }
        }
       
        // Populate the diagnostic collection with our results.
        for(let [filename_absolute, diagnosticArray] of this.fileDiagnosticMap) {
            let fileUri = vscode.Uri.file(filename_absolute);
            this.diagnosticCollection.set(fileUri, diagnosticArray);
        }
    }

    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
        
        // Obtain the diagnostic array for this document
        let diagnosticArray = this.fileDiagnosticMap.get(document.uri.fsPath);
        let resultArray = this.fileResultMap.get(document.uri.fsPath);
        if (!diagnosticArray || !resultArray) {
            return [];
        }

        // todo, add action here
        return [];
    }
}
