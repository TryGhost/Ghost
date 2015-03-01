---
lang: zh
layout: quickstart
meta_title: Ghost 快速入门
heading: Ghost 快速入门
subheading: 立即安装并启动 Ghost.
chapter: quickstart
section: quickstart
---

# 概述 <a id="overview"></a>

快速入门指南是在假定你已经熟悉 [Node](http://nodejs.org)，或者 ruby on rails 这种类似架构的前提下，帮助你安装并运行 Ghost。如果你不太了解上述语言，我们建议你查看更加详尽的[安装指南](/installation.html)。

## 本地运行 Ghost <a id="ghost-local"></a>

Ghost 需要 node `0.10.*` （最新的稳定版）的支持。

如果你尚未安装 Node，那么请前往 <http://nodejs.org> 下载最新版本的 Node.js 安装包。安装包会将 Node 及其非常优秀的包管理器 npm 安装到你的电脑上。

对于使用 Linux 系统的用户，你可能更愿意使用自带的[包管理器来安装 Node](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)，而不是通过 .tar.gz 压缩包来安装。

接下来，从 [Ghost.org/download/](https://ghost.org/download/) 下载最新的 Ghost。将压缩包解压到你希望运行 Ghost 的目录下 - 任何地方都行！

打开终端（mac/linux）或者命令提示符（windows）程序，然后定位到刚才解压的 Ghost 目录（package.json 文件所在的地方）

运行 `npm install --production` 命令来安装 Ghost。

<!--<h2 id="customise">自定义和配置 Ghost</h2>

<h2 id="ghost-deploy">部署 Ghost</h2>

<ol>
    <li>在终端 / 命令行中，执行 <code>npm start</code></li>
    <li><p>你的 Ghost 博客应该已经开始运行了，访问 <a href="http://localhost:2368/">http://localhost:2368/</a> 来看看效果</p></li>
</ol>
-->