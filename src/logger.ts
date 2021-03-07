import * as vscode from "vscode";

export class Logger {
    private static outputChannel : vscode.OutputChannel = vscode.window.createOutputChannel("Maudit");

    public static initialize() : void {
        // this is annoying
        // this.show();
    }

    public static show() : void {
        // Reveal this channel in the UI.
        this.outputChannel.show();
    }

    public static log(msg : string): void {
        // Output the base message.
        this.outputChannel.appendLine(msg);
    }

    public static info(msg : string): void {
        // Output the info to console
        this.outputChannel.appendLine(msg);
    }

    public static error(msg : string, showErrorDialog : boolean = true): void {
        // Prefix the error
        msg = `Error: ${msg}`;

        // Output the error to console
        this.outputChannel.appendLine(msg);

        // Show our error dialog if desired
        if (showErrorDialog) {
            vscode.window.showErrorMessage(msg);
        }

        // Show our output channel
        this.show();
    }
}

// As soon as this class is included, we initialize it.
Logger.initialize();