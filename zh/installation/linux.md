---
lang: zh
layout: installation
meta_title: 如何在服务器上安装Ghost - Ghost中文文档
meta_description: 这里详细讲述如何在你本地或远程环境中安装Ghost博客平台。
heading: 安装Ghost &amp; 开始尝试
subheading: 开始搭建新的博客的第一步
permalink: /zh/installation/linux/
chapter: installation
section: linux
prev_section: windows
next_section: deploy
---


# 在 Linux 上安装<a id="install-linux"></a>

### 安装 Node

*   不管是从 [http://nodejs.org](http://nodejs.org) 下载 `.tar.gz` 存档还是你更喜欢按照 [从一个包管理器安装](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager) 的说明安装
*   通过在终端窗口中输入 `node -v` 和 `npm -v`检查 Node 和 npm 是否安装成功

### 安装并运行 Ghost

*   登录到 [http://ghost.org](http://ghost.org)，然后点击蓝色的 'Download Ghost Source Code' 按钮
*   在下载页，点击下载最新的 zip 压缩文件然后将文件解压到你想运行 Ghost 的地方
*   在终端中，切换到刚才解压的 Ghost 文件夹目录下
*   在终端中输入 `npm install --production` <span class="note">注意是两个 `-`</span>
*   当 npm 安装成功，输入 `npm start` 启动开发模式下的 Ghost
*   在浏览器中，访问 <code class="path">127.0.0.1:2368</code> 即可查看最新搭建的 Ghost 博客
*   访问 <code class="path">127.0.0.1:2368/ghost</code> 并且设置管理员用户并登陆 Ghost 管理员

如果你以 guest 身份登陆的 linux 或者以 SSH 远程连接只有终端，那么：

*   使用正常的操作系统然后找到 Ghost zip 文件的路径（每个版本都不同），保存路径并将 '/zip/' 修改为 '/archives/'
*   在终端中使用 `wget url-of-ghost.zip` 下载 Ghost
*   使用 `unzip -uo Ghost-#.#.#.zip -d ghost`解压缩，然后输入 `cd ghost`
*   输入 `npm install --production` 安装 Ghost <span class="note">注意是两个 `-`</span>
*   当 npm 安装成功，输入 `npm start` 启动开发模式下的 Ghost
*   Ghost 现在就运行在了 localhost 

