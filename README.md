# Ghost 中文版

![Ghost Screenshot](http://diancloud-sc.stor.sinaapp.com/ghost/ghost-sc-1-980x630.jpg)

Ghost是迄今为止最好用的开源博客平台。Ghost博客由前WordPress主管  [John O'Nolan](http://twitter.com/JohnONolan) 和美女工程师 [Hannah Wolfe](http://twitter.com/ErisDS) 创立。开源社区支持率远超WordPress。 [贡献者列表](https://github.com/diancloud/Ghost/contributors)


Ghost中文版由云应用托管服务商 [点云](http://www.diancloud.com) 主导开发和在中国区推广。中文版代码将在与官方版保持一致的前提下，加入一些特有功能。 比如：可以将博文转换成长微博，自动发布到用户绑定的微博上； 可以与用户的公众账号关联，自动生成图文消息并推送等等。


如果你是NodeJS开发者，并热衷于开源软件，欢迎与我们一起共同改进、推广Ghost，让Ghost在中国落地，让更多人可以享受写作的乐趣。

[欢迎访问Ghost中文版官方网站](http://ghost.diancloud.com)




## 使用Ghost


###安装
你可以使用三种方式安装Ghost中文版。

1. **一键安装** 
如果你没有服务器，或者不了NodeJS技术，推荐使用这种安装方式。比自己租VPS还要便宜，不用自己折腾，还有各种服务。[详细介绍](http://ghost.diancloud.com/#fuwu)

2. **Docker Image** 
你可以在装有Docker的服务器上，运行docker run 命令即可。[安装文档](https://github.com/diancloud/Ghost/wiki/Docker-Image)

    docker run -d  -p 80:2368 --name=diancloud-ghost  diancloud/ghost:0.6.0-zh
    

3. **源码安装**
下载已发布版本的源码包，使用 npm install 命令安装。[立即下载Ghost-0.6.0-zh](http://cdn.diancloud.com/ghost/releases/Ghost-0.6.0-zh.zip)

 * 安装NodeJS。 [安装文档](https://github.com/joyent/node/wiki/Installation)
 * 下载Ghost代码。 [即下载Ghost-0.6.0-zh](http://cdn.diancloud.com/ghost/releases/Ghost-0.6.0-zh.zip)
 * 解压源码。
 * 进入代码目录运行  `npm install --production`
 * 在代码目录运行 `npm start --production` 
 * 在浏览器中访问 `http://localhost:2368`。博客后台管理地址： `http://localhost:2368/ghost`。

<a href="https://github.com/TryGhost/Ghost"><img src="https://cloud.githubusercontent.com/assets/120485/6622822/c4c639fe-c8e7-11e4-9e64-5bec06c8b4c3.png" alt="Ghost" /></a>
<a href="https://travis-ci.org/TryGhost/Ghost"><img align="right" src="https://travis-ci.org/TryGhost/Ghost.svg?branch=master" alt="Build status" /></a>

![Ghost Screenshot](https://cloud.githubusercontent.com/assets/120485/6626466/6dae46b2-c8ff-11e4-8c7c-8dd63b215f7b.jpg)

![Ghost is a simple, powerful publishing platform that allows you to share your stories with the world.](https://cloud.githubusercontent.com/assets/120485/6626501/b2bb072c-c8ff-11e4-8e1a-2e78e68fd5c3.png)

The project is maintained by a non-profit organisation called the **Ghost Foundation**, along with an amazing group of independent [contributors](https://github.com/TryGhost/Ghost/contributors). We're trying to make publishing software that changes the shape of online journalism.

- [Ghost.org](https://ghost.org)
- [Latest Release](https://ghost.org/download/)
- [Support](http://support.ghost.org/)
- [Theme Docs](http://themes.ghost.org)
- [Contributing Guide](https://github.com/TryGhost/Ghost/blob/master/CONTRIBUTING.md)
- [Feature Requests](http://ideas.ghost.org/)
- [Dev Blog](http://dev.ghost.org)


# Quick Start Install

Make sure you've installed Node.js - We recommend the latest **Node v0.10.x** release.

Ghost is also compatible with **Node v0.12** and **io.js v1.2**, but please note that these versions are more likely to run into installation problems. May contain nuts. Please use the [forum](https://ghost.org/forum/installation/) for help.

1. Download the [latest release](https://ghost.org/download/) of Ghost
1. Unzip in the location you want to install
1. Fire up a terminal
1. `npm install --production`
1. Start Ghost!
    - Local environment: `npm start`
    - On a server: `npm start --production`
1. `http://localhost:2368/ghost` :tada:

More [install docs](http://support.ghost.org/installation/) here in case you got stuck.

<a name="getting-started"></a>
# Developer Install (from git)

Install Node.js. 

```bash
# Node v0.10.x - full support
# Node v0.12.x and io.js v1.2 - partial support
#
# Choose wisely
```

Clone :ghost:

```bash
git clone git://github.com/tryghost/ghost.git
cd ghost
```

Install grunt. No prizes here.

```bash
npm install -g grunt-cli
```


```bash
npm install
```

  **注意:** 请通过 **上方的下载链接** 或 **点击[发行版页面](https://github.com/diancloud/Ghost/releases/download)**的**绿色按钮**下载。这是已编译好JS和CSS的文件包。如果直接下载源码，安装前，你需要使用 `grunt` 命令编译JS和CSS文件。详见[参与改进](www.github.com)。


###配置 & 使用 

请参考官方中文版手册。 http://ghost.diancloud.com/doc/zh/usage/


## 参与改进
( 中文版计划, 如何参与改进等 待完善 ）