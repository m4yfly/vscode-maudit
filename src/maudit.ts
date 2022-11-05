import * as vscode from 'vscode';
import { Logger } from "./logger";
import { MaduitResult } from "./mauditResults";
import * as config from "./config";
import * as tools from "./tools";
import * as sparkmd5 from "spark-md5";
import * as path from "path";

export let initialized : boolean = false;
export const globalResults : Map<string, MaduitResult[]> = new Map<string, MaduitResult[]>();

let regexMap: Map<string, config.CommonRegRule[]> = new Map<string, config.CommonRegRule[]>();

// Functions
export async function initialize() : Promise<boolean> {
    // Set our initialized flag to false in case of re-initialization.
    initialized = false;

    let langnames = await config.getSupportLang();
    for (let lang of langnames.keys()) {
        regexMap.set(lang, config.getRegexRules(lang));
    }

    initialized = true;

    return initialized;
}

export async function analyze() : Promise<boolean> {
    // Verify there is a workspace folder open to run analysis on.
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        Logger.log('There are no open workspace folders to run Audit Helper analysis on.');
        return false;
    }

    // Print our starting analysis message.
    Logger.log("\u2E3B Starting analysis \u2E3B");

    // If we have not initialized, try to do so now.
    if (!initialized) {
        if(!await initialize()) {
            return false;
        }
    } 

    // Clear any existing results
    globalResults.clear();
    
    let allcount = 0;
    // Loop for every workspace to run analysis on.
    for (let i = 0; i < vscode.workspace.workspaceFolders.length; i++) {

        // Obtain our workspace path.
        const workspaceFolder = vscode.workspace.workspaceFolders[i].uri.fsPath;

        // Execute audit on this workspace.
        await doAnalyze(workspaceFolder);

        let tmpResult = globalResults.get(workspaceFolder);
        if (tmpResult) {
            let wsResults = tmpResult as MaduitResult[];
            allcount += wsResults.length;
        }
    }
    Logger.log(`\u2E3B Analysis: ${allcount} succeeded \u2E3B`);

    // Recalculate hash sourcemappings
    await updateSourceMappingSyncStatus(true);

    // Loop for each result to write and print
    for (let [workspaceFolder, workspaceResults] of globalResults) {
        // If we succeeded in parsing results for this workspace
        if(workspaceResults) {
            // Loop for every result and set its sync status to valid
            for (let workspaceResult of workspaceResults) {
                workspaceResult._ext_in_sync = true;
            }
        }
    }
    Logger.show();
    // We completed analysis without error.
    return true;
}

export async function clear(clearCurrentResults : boolean = true) {
    // Verify there is a workspace folder open to clear results for.
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        return;
    }

    // Clear the current known results
    if (clearCurrentResults) {
        globalResults.clear();
    }
}

//rule, file path, matches
async function regexMatch(lines : string[], filepath: string, langname:string='php') :Promise<MaduitResult[]>{
    let results : MaduitResult[] = [];
    let regexRules : config.CommonRegRule[];
    let thisLangRegex = regexMap.get(langname);
    if(thisLangRegex) {
        regexRules = thisLangRegex;
    } else {
        return results;
    }
    for (let i=0;i<lines.length;i++) {
        for (let rule of regexRules) {
            let res = lines[i].match(rule.regex);
            if (res) {
                let start = 0;
                let ending = 0;
                for (let match of res) {
                    start = lines[i].indexOf(match, start);
                    if (start > -1) {
                        ending = start + match.length;
                        let thisResult = new MaduitResult(rule, filepath, match.trim(), i, start, ending);
                        results.push(thisResult);
                        start = ending;
                    } else {
                        Logger.info("can't find the math content from line");
                    }
                }
            }
        }
    }
    return results;
}


async function doAnalyze(wsFloder : string) : Promise<boolean> {

    let extList :string[] = [];
    let extListWithDot :Map<string,string>[] = [];
    let supportLangs = await config.getSupportLang();
    for (let [key, val] of supportLangs) {
        extList.push(key);
        for (let item of val) {
            extListWithDot.push(new Map([
                ['lang',key],
                ['extWithDot','.' + item]
            ]));
        }
    }

    let {fileMap, err} = await tools.getFileList(wsFloder, extListWithDot);
    if (err) {
        Logger.error(`Get filesList from ${wsFloder} failed.`);
    } else {
        for (let ext of extList) {
            let thisList = fileMap.get(ext);
            if (thisList) {
                for (let filepath of thisList) {
                    let lines = await tools.readFileLines(filepath);
                    if (lines) {
                        let results = await regexMatch(lines, filepath, ext);
                        if (results) {
                            let wsResults = globalResults.get(wsFloder);
                            if (wsResults) {
                                wsResults.push(...results);
                            } else {
                                globalResults.set(wsFloder, results);
                            }
                        }
                    }
                }
            }
        }
    }
    return true;
}


export async function updateSourceMappingSyncStatus(firstTimeCalculation : boolean = false,  fileNameFilter : string | undefined = undefined) {

    // Create a mapping of filename -> source
    let sourceContentMap : Map<string, string[]> = new Map<string, string[]>();
    // Loop for every workspace
    for(let [workspaceFolder, workspaceResults] of globalResults) {
        // Loop through each result element
        for (let workspaceResult of workspaceResults) {
            let workspaceResultValidity : boolean | undefined = undefined;
            // Try to obtain any cached source content
            let sourceMappingFile = workspaceResult.matchFilePath;
            let sourceContent = sourceContentMap.get(sourceMappingFile);

            // If we are trying to only refresh results for a certain filename, we skip if our filename doesnt match.
            if (fileNameFilter && path.normalize(sourceMappingFile) !== path.normalize(fileNameFilter)) {
                continue;
            }

            // If we have no source content cached, we read it.
            if(!sourceContent) {
                sourceContent = await tools.readFileLines(sourceMappingFile);
                sourceContentMap.set(sourceMappingFile, sourceContent);
            }

            if (workspaceResult.matchLineNum < sourceContent.length) {
                // Copy out the source mapped data
                let mappedSource = sourceContent[workspaceResult.matchLineNum].substring(workspaceResult.startingColumn, workspaceResult.endingColumn);
                // Hash the data
                let mappedSourceHash = sparkmd5.hash(mappedSource);

                // Determine if we're calculating hash for the first time, or verifying.
                if(firstTimeCalculation) {
                    workspaceResult._ext_source_hash = mappedSourceHash;
                } else {
                    // If our hash doesn't match, set our result as "out of sync", and skip to the next result.
                    workspaceResultValidity = workspaceResult._ext_source_hash === mappedSourceHash;
                }
            } else {
                workspaceResultValidity = false;
            }
            
            // If we determined a new result validity, set it
            if(workspaceResultValidity !== undefined) {
                workspaceResult._ext_in_sync = workspaceResultValidity;
            }
        }
    }
}