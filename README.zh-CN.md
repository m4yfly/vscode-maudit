# Maduit

> 一个简单的代码审计助手 VSCode插件

## 简介

基于正则的代码审计助手插件

* 基于`Seay源代码审计系统`的正则规则进行了扩展
* 更快的正则匹配速度
* 合并少量`python`及`java`规则

## 安装

* 从VSCode商店搜索`maduit`安装

* 源码安装

  ```
  git clone https://github.com/m4yfly/vscode-maudit.git
  cd vscode-maudit
  npm i
  npm install -g vsce
  vsce package
  ```

  从VScode扩展页面的`...`菜单处，选择VSIX文件安装

## 快速开始

打开包含`php/java/python`文件的项目，插件将自动激活，点击Logo后，将出现新的显示结果的面板，点击面板顶部右侧分析按钮开始匹配过程。

## Thanks

参考了以下项目的代码结构或规则

* [slither-vscode](https://github.com/crytic/slither-vscode)
* [cobra](https://github.com/WhaleShark-Team/cobra)
* [seay](http://cnseay.com/)
* [kiwi](https://github.com/alpha1e0/kiwi)

