---
lang: zh
layout: installation
meta_title: 如何在服务器上安装Ghost - Ghost中文文档
meta_description: 这里详细讲述如何在你本地或远程环境中安装Ghost博客平台。
heading: 安装Ghost &amp; 开始尝试
subheading: 开始搭建新的博客的第一步
permalink: /zh/installation/windows/
chapter: installation
section: windows
prev_section: mac
next_section: linux
---

# 在 Windows 上安装<a id="install-windows"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

### 安装 Node

*   访问 [http://nodejs.org](http://nodejs.org) 点击 install， 将会下载一个 '.msi' 文件。
*   点击该文件启动一个安装程序，这将会安装 Node 和 npm。
*   通过安装程序一步一步完成安装，直到屏幕上显示你已经成功安装 Node.js。

如果你遇到了困难，可以查阅 [这里](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-win.gif "Install node on Windows")

### 下载 & 获取 Ghost

*   在[下载页](https://ghost.org/download/)，点击按钮下载最新的 zip 文件。
*   点击最新下载的文件的下拉箭头，选择 '在文件夹中显示' 。
*   当打开文件夹后，右键选择解压所有文件。

如果你遇到了困难，可以查阅 [这里](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win.gif "Install Ghost on Windows Part 1")

### 安装并运行 Ghost

*   在开始菜单里，找到 'Node.js' 然后点击选择 'Node.js Command Prompt' 。
*   在 Node.js command prompt 中，切换到解压的 Ghost 文件夹目录下。输入：`cd Downloads/ghost-#.#.#` （替换 `#` 为你下载的 Ghost 的版本）。
*   然后，在命令行中输入  `npm install --production` <span class="note">注意是两个 `-`</span>
*   当 npm 安装成功后，输入 `npm start` 启动开发模式下的 Ghost。
*   在浏览器中，访问 <code class="path">127.0.0.1:2368</code> 即可查看最新搭建的 Ghost 博客。
*   访问 <code class="path">127.0.0.1:2368/ghost</code> 并且设置管理员用户并登陆 Ghost 管理员。
*   下一节 [使用说明](/usage) 会介绍 Ghost 的使用。

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win-2.gif "Install Ghost on Windows - Part 2")

