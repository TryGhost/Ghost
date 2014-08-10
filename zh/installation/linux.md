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

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

### 安装 Node

*   你可以通过从 [http://nodejs.org](http://nodejs.org) 下载 `.tar.gz` 存档或者是通过包管理器安装。你可以根据  [这篇文章](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager) 的说明来从包管理器安装 Node
*   通过在终端窗口中输入 `node -v` 和 `npm -v`检查 Node 和 npm 是否安装成功

### 安装并运行 Ghost

*   登录到 [http://ghost.org](http://ghost.org)，然后点击蓝色的 'Download Ghost Source Code' 按钮
*   在下载页，点击下载最新的 zip 压缩文件然后将文件解压到你想运行 Ghost 的地方

**如果你以 guest 身份登陆的 linux 或者以 SSH 远程连接只有终端，那么：**

*   使用以下命令下载 Ghost 的最新版：

    ```
    $ curl -L https://ghost.org/zip/ghost-latest.zip -o ghost.zip
    ```
    
*   使用以下命令解压存档：

    ```
    $ unzip -uo ghost.zip -d ghost
    ```
    
**在你解压好之后，打开一个终端：**

*   切换到刚才解压的 Ghost 文件夹目录下

    ```
    $ cd /你的 Ghost 解压目录
    ```

*   输入以下命令安装 Ghost ：

    ```
    npm install --production
    ```
    <span class="note">注意是两个 `-`</span>
    
*   在 npm 结束安装后，输入以下命令让 Ghost 以开发模式启动：

    ```
    $ npm start
    ```

*   Ghost 将会运行在 **127.0.0.1:2368**<br />
    <span class="note">你可以在 **config.js** 中修改IP地址和端口</span>

*   在浏览器中，访问 <code class="path">127.0.0.1:2368</code> 即可查看最新搭建的 Ghost 博客
*   访问 <code class="path">127.0.0.1:2368/ghost</code> 并且设置管理员用户并登陆 Ghost 管理员
