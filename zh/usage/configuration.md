---
lang: zh
layout: usage
meta_title: 如何使用Ghost - Ghost 文档
meta_description: 一个深入使用Ghost的向导。获得Ghost但不知道如何使用？从这里开始!
heading: 使用 Ghost
subheading: 寻找您的周围，设置您想要的方式
chapter: usage
section: configuration
permalink: /zh/usage/configuration/
prev_section: usage
next_section: settings
---

## 配置 Ghost <a id="configuration"></a>

在您第一次运行Ghost后，您会在Ghost的根目录中发现一个`config.js`文件 ，伴随着`index.js`文件。该文件允许您设置环境之类的配置信息，比如您的网址，数据库和邮件设置。

如果尚未第一次运行Ghost，您不会有这个文件。您可以通过复制`config.example.js`创建一个文件 - 那是Ghost一开始就创建的。 

配置您的Ghost URL，邮件或数据库设置，您喜欢的编辑器打开 `config.js` ，并开始将设置改变为您想要的环境。如果环境您没有遇到，请阅读下面的文档。

## 关于环境 <a id="environments"></a>

Node.js和源于Node.js的Ghost具有内置环境的概念。环境允许您在可能运行的不同的模式中创建不同的配置。默认情况下，Ghost有两个内置的模式：**开发模式**和**生产模式**。

在两种模式或环境之间有一些非常细微的差别。本质上讲**开发模式**用于开发特别是Ghost的调试。同时当您公开运行Ghost的时候，使用“生产模式”。这些差异包括输出日志和错误消息，多少静态资源被串联和压缩等。在**生产模式**，您会得到一个包含了管理所需的所有代码的JavaScript文件，在**开发模式**，您会得到多个文件。

随着Ghost的推进，这些差异将增长并变得更加明显，所以在**生产模式**环境中运行公开博客将越来越重要。或许这引出了一个问题，为什么在大多数人都将要它运行在**生产模式**时，默认的是**开发模式**？Ghost默认使用**开发模式**是因为它是最好的调试的环境，当您首次设置时，您可能最需要的环境。

##  使用环境 <a id="using-env"></a>

为了设置Ghost运行在不同的环境下，您需要使用环境变量。例如，如果您使用`node index.js`正常启动Ghost您可以用：

`NODE_ENV=production node index.js`

或者，如果您永远正常使用：

`NODE_ENV=production forever start index.js`

或者，如果您使用`npm start`启动Ghost，您可以用稍微容易记住的方式：

`npm start --production`

### 为什么使用`npm install --production`？

我们被问了好几次，为什么Ghost默认运行在开发模式，而安装文档却说运行 `npm install --production` ？这是一个很好的问题！如果您在安装Ghost时不包含  `--production` ，并不会产生什么问题，但它会安装额外的仅仅是对想要开发Ghost核心的人有用的软件包。这也需要您有一个特定的包，使用 `npm install -g grunt-cli` 命令安装在全局中的 `grunt-cli` 包，如果您只是想作为一个博客运行Ghost的话，它是不是必需的。 
