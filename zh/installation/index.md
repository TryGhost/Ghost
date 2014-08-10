---
lang: zh
layout: installation
meta_title: 如何在服务器上安装Ghost - Ghost中文文档
meta_description: 这里详细讲述如何在你本地或远程环境中安装Ghost博客平台。
heading: 安装Ghost &amp; 开始尝试
subheading: 开始搭建新的博客的第一步
chapter: installation
next_section: mac
---

## 概览 <a id="overview"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

Ghost文档还不完备，仍在继续完善中，每天可能都会有更新和改进。如果你遇到了难题或者有改进意见，请告诉我们。

Ghost构建于[Node.js](http://nodejs.org)平台之上，支持`0.10.*`版本（最新稳定版）的Node.js。

在你的本地计算机上运行Ghost其实很简单，前提是你已经安装了Node.js。

### 什么是Node.js？

[Node.js](http://nodejs.org)是构建快速、扩展性良好并且高效的web应用的开发平台。在过去的20年间，web从一堆静态页面进化为能够支持复杂web应用（例如Gmail和facebook）的平台。而JavaScript这一编程语言是这一进程的推进剂。

[Node.js](http://nodejs.org)让我们具有了开发服务器端JavaScript程序的能力。而在以前，JavaScript只能在浏览器上运行，如果要开发服务器端的程序，就要使用PHP一类的编程语言了。如果能够用同一种开发语言来完成web应用的开发，这将是多么棒！并且，Node.js还赋予了前端开发工程师更大的能力。

[Node.js](http://nodejs.org)让这一切变为可能，其原理是对Google Chrome浏览器所用的JavaScript引擎进行了包装，让它能够跨平台运行。也就是说，你能在自己的电脑上非常快速的安装Ghost并让它非常快捷、方便的跑起来。
    接下来我们详细讲解如何在[Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/)、[Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/window/)或[Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/)上安装Ghost，另外还介绍了如何在[服务器或托管空间]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy)上部署Ghost。


### 起步

如果你厌烦了手工安装Node.js和Ghost，可以试试[BitNami](http://bitnami.com/)团队开发的[Ghost安装工具](http://bitnami.com/stack/ghost)，它提供了对所有主流平台的支持。

Ghost支持的平台：

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

如果你决定在你的服务器或托管空间上部署Ghost，这对我们是个非常好的消息！下面的文档可以给你详细的部署指南，从手工设置到一键安装包都有涉及。

<div class="text-center install-ghost">
   <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">部署Ghost</a>
</div>


请记住，Ghost还非常新，它的开发小组还在非常努力的实现新的功能。如果你需要升级Ghost到最新版本，请参考[Ghost升级文档]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/upgrading/)。
    如果遇到任何问题，请参考[除错指南]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/)，如果你的问题还不能得到解决，请在[Ghost论坛](http://ghost.org/forum)提问，这里聚集了Ghost核心小组的成员和社区成员，他们会非常乐意帮你解决问题。