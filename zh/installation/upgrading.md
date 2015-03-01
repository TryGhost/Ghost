---
lang: zh
layout: installation
meta_title: 如何在服务器上安装Ghost - Ghost中文文档
meta_description: 这里详细讲述如何在你本地或远程环境中安装Ghost博客平台。
heading: 安装Ghost &amp; 开始尝试
subheading: 开始搭建新的博客的第一步
permalink: /zh/installation/upgrading/
chapter: installation
section: upgrading
prev_section: deploy
next_section: troubleshooting
---

# 更新 Ghost <a id="upgrade"></a>

更新 Ghost 是非常简单的。

有几种方法可供选择。下面描述了将会发生什么，并且你要按照 [点击风格](#how-to) 和通过一个 [命令行](#cli) 一步步实现。所以你可以自由选择感觉最舒适的方法。

<p class="note"><strong>备份！</strong> 总是在更新前执行一次备份。首先请阅读 <a href="#backing-up">备份指南</a>。</p>

## 概述

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/folder-structure.png" style="float:left" />

Ghost 安装后，有一个与左边图片相似的文件夹结构，包括两个主要的目录 <code class="path">content</code> 和 <code class="path">core</code> ，和其他一些文件。

更新 Ghost 也无非就是将旧文件替换为新文件，重新运行 `npm install` 更新 <code class="path">node_modules</code> 文件夹，然后重新启动 Ghost 使生效。

记住，Ghost 默认将所有的自定义数据，主题，图片等存储到 <code class="path">content</code> 目录下，所以确保此目录安全！只替换 <code class="path">core</code> 目录和根目录下的文件，一切就会正常。

## 备份 <a id="backing-up"></a>

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/export.png" style="float:right" />

*   为了备份你的数据库中的所有数据，启动 Ghost 访问 `/ghost/debug/` 并且登录。点击蓝色的 `EXPORT` 按钮，将会下载下一个包含你所有数据的 JSON 文件。
*   为了备份你的所有的自定义主题和图片，你需要复制一份 <code class="path">content/themes</code> 和 <code class="path">content/images</code>内的文件。

<p class="note"><strong>注意:</strong> 如果你喜欢的话，你也可以通过复制 <code class="path">content/data</code> 实现数据库的备份。但是 <strong>记住</strong> 要先停止 Ghost 后再去复制。</p>

## 如何更新 <a id="how-to"></a>

如何更新本地机器上的 Ghost 呢？

<p class="warn"><strong>警告: </strong><strong>不要</strong>在 mac 现有的安装上复制和粘贴整个 Ghost 文件夹。在使用 Transmit 或者其他 FTP 工具上传的时候，<strong>不要</strong>选择 <strong>REPLACE</strong> 而要选择 <strong>MERGE</strong>。</p>

*   从 [Ghost.org](http://ghost.org/download/) 下载最新版本的 Ghost 
*   解压 zip 文件到一个临时的目录下
*   复制所有的根目录下的文件，包括：index.js， package.json， Gruntfile.js， config.example.js 和 license 、 readme 文件
*   下一步用新的 `core` 目录替换旧的 `core` 目录
*   版本发布的更新包括 Casper （默认的主题），所以用新的替换 `content/themes/casper` 
*   运行 `npm install --production` 
*   最后，重启 Ghost 使改变生效

## 使用命令行 <a id="cli"></a>

<p class="note"><strong>备份！</strong> 总是在更新前执行一次备份。首先请阅读 <a href="#backing-up">备份指南</a> 。</p>

### 在 mac 上使用命令行 <a id="cli-mac"></a>

下面的截屏视频显示了如何按步更新 Ghost ，在从下载了 zip 文件到 <code class="path">~/Downloads</code> 并且安装 Ghost到 <code class="path">~/ghost</code> 的前提下。<span class="note">**注意：**`~`在 mac 和 linux 中表示用户主目录。</span>

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/upgrade-ghost.gif)

步骤如下：

*   <code class="path">cd ~/Downloads</code> - 切换到下载的最新版本 Ghost 所在的目录
*   `unzip ghost-0.3.1.zip -d ghost-0.3.3` - 解压 ghost 为 <code class="path">ghost-0.3.3</code> 
*   <code class="path">cd ghost-0.3.3</code> - 进入 <code class="path">ghost-0.3.3</code> 目录内
*   `ls` - 显示当前目录下所有文件和文件夹
*   `cp *.md *.js *.txt *.json ~/ghost` - 复制所有 <code class="path">~/ghost</code> 目录下的 .md .js .txt 和 .json 文件
*   `cp -R core ~/ghost` - 复制 <code class="path">core</code> 目录和它包含的所有内容到 <code class="path">~/ghost</code>
*   `cp -R content/themes/casper ~/ghost/content/themes` - 复制 <code class="path">casper</code> 目录和它包含的所有文件到 <code class="path">~/ghost/content/themes</code> 
*   `cd ~/ghost` -切换到 <code class="path">~/ghost</code> 目录下
*   `npm install --production` - 安装 Ghost
*   `npm start` - 启动 Ghost

### 在 linux 上使用命令行 <a id="cli-server"></a>

*   首先你需要知道最新版本 Ghost 的 URL。通常为 `http://ghost.org/zip/ghost-latest.zip` 
*   通过 `wget http://ghost.org/zip/ghost-latest.zip` 下载最新的 zip 文件（或者带着版本号的 Ghost 文件的 URL）
*   使用 `unzip -uo ghost-0.3.*.zip -d path-to-your-ghost-install` 解压
*   运行 `npm install --production` 安装最新的依赖包
*   最后，重启 Ghost 使生效

**此外**， [howtoinstallghost.com](http://www.howtoinstallghost.com/how-to-update-ghost/) 也介绍了如何在 linux 上更新 Ghost。

### 如何更新 DigitalOcean Droplet <a id="digitalocean"></a>

<p class="note"><strong>备份！</strong> 总是在更新前执行一次备份。首先请阅读 <a href="#backing-up">备份指南</a> 。</p>

*   首先你需要知道最新版本 Ghost 的 URL。通常为 `http://ghost.org/zip/ghost-latest.zip` 
*   一旦你获取了最新版本的 URL ，在你的 Droplet 控制台中输入 `cd /var/www/` 切换到 Ghost 代码库
*   下一步，输入 `wget http://ghost.org/zip/ghost-latest.zip` （或者带着版本号的 Ghost 文件的 URL）
*   使用 `unzip -uo ghost-0.3.*.zip -d ghost` 解压
*   使用 `chown -R ghost:ghost ghost/*` 确保所有文件都拥有正确的权限
*   运行 `npm install` 安装最新的依赖包
*   最后，使用 `service ghost restart` 重启 Ghost 使改变生效

## 怎样更新 Node.js 到最新版本 <a id="upgrading-node"></a>

如果你最初已经从 [Node.js](nodejs.org) 安装了 Node.js 了，你可以通过下载并安装最新版本的 Node.js 实现更新。这样新版本会覆盖之前安装的旧版本。

如果你使用的 Ubuntu，或者其他 linux 的发行版，你可以使用以下命令安装： `sudo apt-get install nodejs` 。

你**不必**重启服务器或者 Ghost 。
