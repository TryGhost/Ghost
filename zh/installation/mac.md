---
lang: zh
layout: installation
meta_title: 如何在服务器上安装Ghost - Ghost中文文档
meta_description: 这里详细讲述如何在你本地或远程环境中安装Ghost博客平台。
heading: 安装Ghost &amp; 开始尝试
subheading: 开始搭建新的博客的第一步
permalink: /zh/installation/mac/
chapter: installation
section: mac
prev_section: installation
next_section: windows
---


# 在 Mac 上安装 <a id="install-mac"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

为了安装 Node.js 和 Ghost 到你的 mac 上，你需要打开一个终端窗口。你可以通过打开 spotlight 并输入 "Terminal" 打开一个终端。

### 安装 Node

*   访问 [http://nodejs.org](http://nodejs.org) 点击 install，将会下载一个 '.pkg' 文件
*   点击下载的文件打开安装程序，将会同时安装 node 和 npm
*   点击安装程序，最后输入你的密码，并点击 “安装软件”
*   一旦安装成功，在终端窗口中输入 `echo $PATH` 检查 '/usr/local/bin/' 路径已经存在于环境变量中

<p class="note"><strong>注意:</strong> 如果 '/usr/local/bin' 没有添加到 $PATH 环境变量， 查阅 <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting#export-path">故障排除提示</a> 解决这个问题。</p>

如果你遇到了困难，可以查阅 [这里](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Install Node on Mac")

### 安装并运行 Ghost

*   在[下载页](https://ghost.org/download/)，点击下载最新的 zip 压缩文件
*   点击最新下载的文件的下拉箭头，选择 '在文件夹中显示'
*   双击下载的 zip 文件解压它
*   然后，将解压的 'ghost-#.#.#' 文件拖放到打开的终端窗口的标签页上，此时会在该路径下打开一个新的终端标签页
*   在新的终端标签页输入 `npm install --production` <span class="note">注意是两个 `-`</span>
*   当 npm 安装成功，输入 `npm start` 启动开发模式下的 Ghost
*   在浏览器中，访问 <code class="path">127.0.0.1:2368</code> 即可查看最新搭建的 Ghost 博客
*   访问 <code class="path">127.0.0.1:2368/ghost</code> 并且设置管理员用户并登陆 Ghost 管理员
*   下一节 [使用说明](/usage) 会介绍 Ghost 的使用

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)

