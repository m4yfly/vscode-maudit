import * as vscode from 'vscode';
import * as tools from './tools';
import {Logger} from './logger';

let langMessage = 'en';

if (vscode.env.language === 'zh-cn') {
    langMessage = 'zh';
}

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
        this.regex = RegExp(rawRule.regex, 'ig');  // ignore case
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
    let names:Map<string, string[]> = new Map<string, string[]>();
    names.set('php',['php','php3','php4','php5','php7','pht','phtml']);
    names.set('java',['java']);
    names.set('python',['py']);
    names.set('perl',['pl','pm']);
    return names;
}