# Maduit

>Simple source code security audit helper

[简体中文](README.zh-CN.md) | English

## Usages

![image-20200312214824131](https://github.com/m4yfly/vscode-maudit/blob/master/imgs/demo.png?raw=true)

## Features

* Analyze open workspaces
* View results as native Visual Studio Code information
* See annotations for relevant source code for each issue

## Installation

### From the Visual Studio Marketplace

Install `maduit` from the Visual Studio Marketplace within the Extensions tab of Visual Studio Code.

### From source

````
git clone https://github.com/m4yfly/vscode-maudit.git
cd vscode-maudit
npm i
npm install -g vsce
vsce package
````

`maudit-x.x.x.vsix` will be created.

Install the VSIX file in Visual Studio through `Extensions`, under the `...` menu.

## Getting Started

After installing the extension, simply open a workspace containing any `php/java/python` files. The extension will activate, revealing the `Maduit` logo on the action bar. Click it to reveal a new container with a results explorer. Hovering over the explorer tree will reveal buttons on the top title bar which can be used to run `Maduit` and delete results.

## Thanks

* [slither-vscode](https://github.com/crytic/slither-vscode)
* [cobra](https://github.com/WhaleShark-Team/cobra)
* [seay](http://cnseay.com/)
* [kiwi](https://github.com/alpha1e0/kiwi)

## License

AGPL-3.0