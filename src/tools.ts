import * as path from "path";
import * as fs from "fs";
import * as util from "util";
import {Logger} from "./logger";

let readdir = util.promisify(fs.readdir);
let fstat = util.promisify(fs.stat);
let asynReadfile = util.promisify(fs.readFile);

// get all files path with exts
export async function getFileList(fileDir :string, exts :Map<string,string>[]) : Promise<{fileMap: Map<string, string[]>, err: string}> {
    let thisFileMap: Map<string, string[]> =  new Map<string, string[]>();
    let error: string = '';
    for(let item of exts) {
        let thisLang = item.get('lang');
        if(thisLang) {
            thisFileMap.set(thisLang, []);
        }
    }
    try{
        let files = await readdir(fileDir);
        if (files && files.length) {
            for (let filename of files) {
                let absPath = path.join(fileDir, filename);
                let filestat = await fstat(absPath);
                if (filestat.isSymbolicLink()) {
                    continue;
                }
                if (filestat) {
                    if (filestat.isFile()) {
                        let filext = path.extname(absPath);
                        let isAdd = false;
                        for(let item of exts) {
                            let thisLang = item.get('lang');
                            let thisExts = item.get('extWithDot');
                            if(!thisLang || !thisExts) {
                                continue;
                            }
                            if (thisExts === filext) {
                                let thisExtList = thisFileMap.get(thisLang);
                                if (thisExtList) {
                                    thisExtList.push(absPath);
                                    isAdd = true;
                                }
                                break;
                            }
                        }
                        if(!isAdd){
                            let fileSize = filestat.size;
                            if (fileSize > 500 * 1024) {
                                continue; // if file size > 500k, ignore
                            }
                            try {
                                let lines = await readFileLines(absPath);
                                if(lines.length > 1) {
                                    for (let thisExt of thisFileMap.keys()) {
                                        // ext appare in 1st line
                                        if (lines[0].includes(thisExt)) { 
                                            let thisExtList = thisFileMap.get(thisExt);
                                            if (thisExtList) {
                                                thisExtList.push(absPath);
                                                break;
                                            }
                                        }
                                    }
                                }
                            } catch(err) {
                                //safely ignore
                                Logger.info(`Read file contents failed:${absPath}`);
                            }
                        }
                    }
                    else if (filestat.isDirectory()) {
                        let {fileMap: tmpFileMap, err: dirErr} = await getFileList(absPath, exts);
                        if (!dirErr) {
                            for (let [tmpExt, tmpList] of tmpFileMap) {
                                let thisExtList = thisFileMap.get(tmpExt);
                                if (thisExtList) {
                                    thisExtList.push(...tmpList);
                                } else {
                                    thisFileMap.set(tmpExt, tmpList);
                                }
                            }
                        }
                    }
                }
            }
        }
    } catch(err) {
        error = String(err);
    }
    return {fileMap: thisFileMap, err:error};
}

export async function readFileLines(filePath :string) : Promise<string[]> {
    let filelines : string[] = [];
    try {
        let content = await asynReadfile(filePath);
        if (content) {
            filelines = content.toString().split("\n");
        }
    } catch (err) {
        Logger.info(`Warn: read file failed:${filePath}`);
    }
    return filelines;
}