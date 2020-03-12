import * as vscode from "vscode";
import * as maudit from "./maudit";
import * as path from "path";
import * as mauditResults from "./mauditResults";
import * as extension from "./extension";
import * as nls from 'vscode-nls';

const localize = nls.loadMessageBundle();

// Generic tree node implementation.
export class ExplorerNode extends vscode.TreeItem {
    public nodes : ExplorerNode[];
    public readonly originalLabel : string;
    constructor(originalLabel: string, collapsibleState?: vscode.TreeItemCollapsibleState) {
        super(originalLabel, collapsibleState);
        this.originalLabel = originalLabel;
        this.nodes = [];
        this.command = {
            title: "",
            command: "maudit.clickedExplorerNode",
            arguments: [this],
        };
    }
}

// A special type of node which denotes an issue.
export class CheckResultNode extends ExplorerNode {
    public workspaceFolder : string;
    public result : mauditResults.MaduitResult;
    public checkNodeParent : ExplorerNode | undefined;
    constructor(workspaceFolder : string, workspaceResult : mauditResults.MaduitResult) {
        let thisFileName = path.basename(workspaceResult.matchFilePath);
        let message = localize('explorerTree.resultdesc', '$0 : line $1, column $2');
        message = message.replace('$0', thisFileName);
        message = message.replace('$1', workspaceResult.matchLineNum.toString());
        message = message.replace('$2', workspaceResult.startingColumn.toString());
        super(`${message}`, vscode.TreeItemCollapsibleState.None);
        this.result = workspaceResult;
        this.workspaceFolder = workspaceFolder;
    }
}

// The explorer/treeview for ahelper analysis results.
export class AHelperExplorer implements vscode.TreeDataProvider<ExplorerNode> {
    
    public changeTreeEmitter: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    public readonly onDidChangeTreeData: vscode.Event<any> = this.changeTreeEmitter.event;

    private bySeverityType : ExplorerNode = new ExplorerNode("By Type");
    private bySeverityMap :  Map<string, ExplorerNode> = new Map<string, ExplorerNode>();
    private byResultMap : Map<mauditResults.MaduitResult, CheckResultNode> = new Map<mauditResults.MaduitResult, CheckResultNode>();

    // A node which is not rendered itself, but contains all nodes which will be shown.
    private rootNode : ExplorerNode = this.bySeverityType;

    constructor(private context: vscode.ExtensionContext) {

    }

    public async refreshExplorer() {

        this.bySeverityType.nodes = [];

        // Clear our maps
        this.byResultMap.clear();

        let vulnType : string[] = [];

        for (let [workspaceFolder, wsResults] of maudit.globalResults) {
            
            for (let wsResult of wsResults) {

                if (vulnType.indexOf(wsResult.ruleTypeName) < 0) {
                    vulnType.push(wsResult.ruleTypeName);
                    let vtype = wsResult.ruleTypeName;
                    let thisNode = new ExplorerNode(vtype, vscode.TreeItemCollapsibleState.Expanded);
                    this.bySeverityType.nodes.push(thisNode);
                    this.bySeverityMap.set(vtype, thisNode);
                }

                let issueNode = new CheckResultNode(workspaceFolder, wsResult);

                // Set it in our result->node map.
                this.byResultMap.set(wsResult, issueNode);

                let typeNode = this.bySeverityMap.get(wsResult.ruleTypeName);
                if (typeNode) {
                    typeNode.nodes.push(issueNode);
                    issueNode.checkNodeParent = typeNode;
                }
            }

        }

        // Refresh icons for our results
        this.refreshIconsForCheckResults();

        // Fire the event to refresh our tree
        this.changeTreeEmitter.fire();

        // Fire the event to refresh our diagnostics
        await extension.diagnosticsProvider.refreshDiagnostics();
    }

    public getParent(element: ExplorerNode): ExplorerNode | undefined {
        // Verify this is a check result
        if (element instanceof CheckResultNode) {
            let checkResultNode = <CheckResultNode>element;

            return checkResultNode.checkNodeParent;
        }

        // The parent could not be obtained.
        return undefined;
    }

    public refreshIconsForCheckResults() {
        // Loop for each check result
        for (let [checkResult, checkNode] of this.byResultMap) {
            if (checkResult._ext_in_sync) {
                checkNode.iconPath = { 
                    light: this.context.asAbsolutePath("resources/explorer-result-blank.svg"),
                    dark: this.context.asAbsolutePath("resources/explorer-result-blank.svg"),
                };
            } else {
                checkNode.iconPath = { 
                    light: this.context.asAbsolutePath("resources/explorer-result-oos-light.svg"),
                    dark: this.context.asAbsolutePath("resources/explorer-result-oos-dark.svg"),
                };
            }
        }
    }

    public async clickedNode(node : ExplorerNode) {
        // If this is a check result node, go to it.
        if (node instanceof CheckResultNode) {
            let checkResultNode = node as CheckResultNode;
            mauditResults.gotoResultCode(checkResultNode.workspaceFolder, checkResultNode.result);
        }
    }


    public getTreeItem(element: ExplorerNode): vscode.TreeItem {
        return element;
    }

    public getNodeFromResult(result : mauditResults.MaduitResult) : CheckResultNode | undefined {
        return this.byResultMap.get(result);
    }

    public getChildren(element?: ExplorerNode): ExplorerNode[] {
        // Create our resulting list
        let children : ExplorerNode[] = [];

        if (element) {
            children = element.nodes;
        } else if (this.rootNode.nodes.length !== 0) {
            children = this.rootNode.nodes;
        }

        // If we are populated root nodes and have no results, return a node to represent that.
        if (!element && children.length === 0) {
            return [new ExplorerNode("<No analysis results>")];
        }

        return children;
    }
}