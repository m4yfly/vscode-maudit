import * as path from "path";
import * as fs from "fs";
import * as util from "util";
import {Logger} from "./logger";

let readdir = util.promisify(fs.readdir);
let fstat = util.promisify(fs.stat);
let asynReadfile = util.promisify(fs.readFile);

// get all files path with exts
export async function getFileList(fileDir :string, exts :string[]) : Promise<{fileMap: Map<string, string[]>, err: string}> {
    let thisFileMap: Map<string, string[]> =  new Map<string, string[]>();;
    let error: string = '';
    try{
        let files = await readdir(fileDir);
        if (files && files.length) {
            for (let filename of files) {
                let absPath = path.join(fileDir, filename);
                let filestat = await fstat(absPath);
                if (filestat) {
                    if (filestat.isFile()) {
                        let filext = path.extname(absPath);
                        if (exts.indexOf(filext) > -1) {
                            let thisExtList = thisFileMap.get(filext);
                            if (thisExtList) {
                                thisExtList.push(absPath);
                            } else {
                                thisFileMap.set(filext, [absPath]);
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
    let content = await asynReadfile(filePath);
    if (content) {
        filelines = content.toString().split("\n");
    }
    return filelines;
}