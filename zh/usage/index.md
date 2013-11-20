---
lang: zh
layout: usage
meta_title: 如何使用 Ghost - Ghost 中文文档
meta_description: 深入讲解 Ghost 博客平台的使用。搭建了 Ghost 博客却不知道怎么使用吗？看这里吧！
heading: 使用 Ghost
subheading: 了解它，使用它
chapter: usage
next_section: configuration
---

## 概览 <a id="overview"></a>

相信你的 Ghost 博客已经安装并可以运行了，那么，现在可以开始写博客了。下面的章节将带你了解 Ghost 的一切细节，一旦你熟悉了 Ghost 的一切，你就可以让它做任何事。

### 第一次运行

如果你是头一次运行 Ghost，首先就要创建管理员账号。启动你所喜欢的任何浏览器，输入这个网址（URL） <code class="path">&lt;your URL&gt;/ghost/signup/</code>。你将看到如下画面：

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/ghost-signup.png)

*   填写 **Full Name（全名）** 一栏，它将作为所有博客文章的作者名称出现。
*   然后输入 **Email Address（邮件地址）** - 请确保邮件地址的正确，然后仔细输入非常重要的 **Password** （至少8个字符）。
*   点击蓝色的 **Sign Up（注册）** 按钮，你就可以登录进博客系统了。

大功告成！现在就可以开始写博客了。

#### 提示信息

在你首次运行 Ghost 时，你将在屏幕顶部看到一条蓝色的信息提示，如图所示：

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/first-run-info.png)

这是告诉你 Ghost 运行时所配置的一些信息，例如运行环境、你所设置的URL。请参考 [配置](/usage/configuration/) 一节以获取更多关于运行环境和如何配置 Ghost 的详细信息。每次登陆 Ghost 系统时都会出现这条信息（其实这是一个bug），而且无法去除，如果多次看到这条信息，并且已经了解它所提示的内容了，直接点击X号将其关闭即可。在其它地方就不会出现了。

你还可能会看到一条橙色警告信息，提示你设置邮件：

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/email-warning.png)

邮件设置并不是必须设置项，可以忽略，直接进入开始写博客就行，但是，建议你有时间的话还是看看 [邮件设置文档](/mail) ，了解一下如何配置 Ghost 发邮件。目前这个功能的唯一作用就是当你忘记密码时，发送你的重置密码邮件。 虽然对于写博客并不重要，但是当你需要的时候它就很重要了！

