import * as vscode from "vscode";
import * as config from "./config";
import {Logger} from "./logger";

export class MaduitResult {
    ruleTypeName: string;
    ruleDescription: string;
    matchFilePath: string;
    matchContent: string;
    matchLineNum: number;
    startingColumn: number;
    endingColumn: number;
    _ext_in_sync : boolean | undefined;
    _ext_source_hash : string | undefined; // Extension: Hash of mapped source code.
    constructor(rule :config.CommonRegRule,filePath: string, content: string, lineNum:number, start:number, ending:number) {
        this.ruleTypeName = rule.type_name;
        this.ruleDescription = rule.description;
        this.matchFilePath = filePath;
        this.matchContent = content;
        this.matchLineNum = lineNum;
        this.startingColumn = start;
        this.endingColumn = ending;
    }
}

export async function getResultElementRange(result : MaduitResult, elementIndex : number = 0, cleanerOverrides : boolean = true) : Promise<[number, number, number, number]> {

    return [result.matchLineNum, result.startingColumn, result.matchLineNum, result.endingColumn];
}

export async function gotoResultCode(workspaceFolder : string, result : MaduitResult) {
    try {
        // Obtain the filename
        let filename_absolute = result.matchFilePath;
        let fileUri : vscode.Uri = vscode.Uri.file(filename_absolute);

        // If this is out of sync, show an error.
        if (!result._ext_in_sync) {
            Logger.error("Could not navigate to maduit result. The mapped source code has been modified.");
            return;
        }

        // Open the document, then select the appropriate range for source mapping. 
        vscode.workspace.openTextDocument(fileUri).then((doc) => {
            vscode.window.showTextDocument(doc).then(async (editor) => {
                if (vscode.window.activeTextEditor) {
                    // We define the selection from the element.
                    let [startLine, startColumn, endLine, endColumn] = await getResultElementRange(result);
                    const selection = new vscode.Selection(startLine, startColumn, endLine, endColumn);

                    // Set the selection.
                    vscode.window.activeTextEditor.selection = selection;
                    vscode.window.activeTextEditor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
                }
            });
        });
    } catch (r) {
        // Log our error.
        Logger.error(r.message);
        
    }
}