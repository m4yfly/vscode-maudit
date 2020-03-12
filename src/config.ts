import * as nls from 'vscode-nls';
import * as tools from './tools';
import {Logger} from './logger';

// The example uses the file message format.
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

const langMessage = localize('rule.language', 'en');

export interface RawComRegRule {
    type_name : string;
    regex: string;
    description: string;
}

export class CommonRegRule {
    type_name : string;
    regex: RegExp;
    description: string;
    constructor (rawRule : RawComRegRule) {
        this.type_name = rawRule.type_name;
        this.regex = RegExp(rawRule.regex, 'g');
        this.description = rawRule.description;
    }
}

export function getRegexRules(langname: string) {
    let rules: CommonRegRule[] = [];

    const ruleFile = `${langname}.${langMessage}.json`;

    const regRules = require(`../config/${ruleFile}`);

    for (let rule of <RawComRegRule[]>regRules) {
        let newRule = new CommonRegRule(rule);
        rules.push(newRule);
    }
    return rules;
}

export async function getSupportLang() {
    let names: string[] = ['php','java','py'];
    //Fix me, load exts from filesystem.
    // let {fileMap, err} = await tools.getFileList('../config/', ['.json']);

    // if (!err) {
    //     let files = fileMap.get('.json');
    //     Logger.log(String(files));
    //     if (files) {
    //         for (let filename of files) {
    //             let prefix = filename.split('.')[0];
    //             names.push(prefix);
    //         }
    //     }
    // } else {
    //     Logger.error(err);
    // }
    return names;
}