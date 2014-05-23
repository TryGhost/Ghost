---
lang: zh
layout: installation
meta_title: 如何在服务器上安装Ghost - Ghost中文文档
meta_description: 这里详细讲述如何在你本地或远程环境中安装Ghost博客平台。
heading: 安装Ghost &amp; 开始尝试
subheading: 开始搭建新的博客的第一步
permalink: /zh/installation/deploy/
chapter: installation
section: deploy
prev_section: linux
next_section: upgrading
---

## 开始 Ghost 之旅 <a id="deploy"></a>

准备好开始 Ghost 之旅了吗？ OK !

第一个需要你做的决定就是，是否选择自己手动安装 Ghost ，还是选择从安装程序安装。

### 安装程序安装

目前有以下几种使用简单的安装程序安装的方法：

*   部署到 [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost)
*   使用 [Rackspace deployments](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html) 启动 Ghost
*   搭建在 [DigitalOcean Droplet](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application) 

### 手动安装

你需要一个主机空间，或者可以安装 [Node.js](http://nodejs.org) 的服务器。
    这意味着着比如云空间 ([Amazon EC2](http://aws.amazon.com/ec2/)， [DigitalOcean](http://www.digitalocean.com)， [Rackspace Cloud](http://www.rackspace.com/cloud/))， VPS ([Webfaction](https://www.webfaction.com/)， [Dreamhost](http://www.dreamhost.com/servers/vps/)) 或者其他拥有 SSH (terminal) 并且允许安装 Node.js 的平台。目前有很多这种比较便宜的平台。

目前还不能在 cPanel 风格的共享主机（通常用于 PHP）上运行。虽然有些（cPanel）支持 Ruby 将来也许支持 Node.js 的主机也同样不行。

<p>不幸的是，一些 Node.js 主机提供商比如说 **Nodejitsu** 和 **Heroku** 与 Ghost 并不兼容。它们会工作，但会删除你的文件，所以你上传的图片和数据库的内容都会消失。Heroku 支持 MySQL 数据库，你可以使用它来弥补这个问题，但你仍然会丢失一些上传的图片。

以下链接包含了如何开始和运行的说明：

*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - from [howtoinstallghost.com](http://howtoinstallghost.com)
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - from [Corbett Barr](http://ghosted.co)
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - from [howtoinstallghost.com](http://howtoinstallghost.com)
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linux service) - from [Gilbert Pellegrom](http://ghost.pellegrom.me/)
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - from [Gregg Housh](http://0v.org/)
*   ...check the [installation forum](https://en.ghost.org/forum/installation) for more guides ...

## 让 Ghost 一直运行

前面提到的启动 Ghost 使用 `npm start` 命令。这是一个在开发模式下启动和测试的不错的选择，但是通过这种命令行启动的方式有个缺点，即当你关闭终端窗口或者从 SSH 断开连接时，Ghost 就停止了。为了防止 Ghost 停止工作，有两种方式解决这个问题。

### Forever ([https://npmjs.org/package/forever](https://npmjs.org/package/forever))

你可以使用 `forever` 以后台任务运行 Ghost 。`forever` 将会按照 Ghost 的配置，当进程 crash 后重启 Ghost。

*   通过 `npm install forever -g` 安装 `forever` 
*   为了让 `forever` 从 Ghost 安装目录运行，输入 `NODE_ENV=production forever start index.js`
*   通过 `forever stop index.js` 停止 Ghost
*   通过 `forever list` 检查 Ghost 当前是否正在运行

### Supervisor ([http://supervisord.org/](http://supervisord.org/))

流行的 Linux 发行版——例如 Fedora， Debian 和 Ubuntu，都包含一个 Supervisor 包：一个进程控制系统，允许在启动的时候无需初始化脚本就能运行 Ghost。不像初始化脚本一样，Supervisor 可以移植到不同的发行版和版本。

*   根据不同的 Linux 发行版 [安装 Supervisor](http://supervisord.org/installing.html) 。如下所示：
    *   Debian/Ubuntu： `apt-get install supervisor`
    *   Fedora： `yum install supervisor`
    *   其他大多数发行版： `easy_install supervisor`
*   通过 `service supervisor start` 确保 Supervisor 运行
*   为 Ghost 创建一个启动脚本。通常为 `/etc/supervisor/conf.d/ghost.conf` ，例如：

    ```
    [program:ghost]
    command = node /path/to/ghost/index.js
    directory = /path/to/ghost
    user = ghost
    autostart = true
    autorestart = true
    stdout_logfile = /var/log/supervisor/ghost.log
    stderr_logfile = /var/log/supervisor/ghost_err.log
    environment = NODE_ENV="production"
    ```

*   使用 Supervisor 启动 Ghost：`supervisorctl start ghost`
*   停止 Ghost： `supervisorctl stop ghost`

详细内容请参阅 [Supervisor 文档](http://supervisord.org)。

### 初始化脚本

Linux 系统在启动的时候会运行初始化脚本。这些脚本通常存在于 /etc/init.d 。为了让 Ghost 一直运行下去甚至自动重启，你可以设置一个初始化脚本来完成这个任务。以下的例子工作在 Ubuntu ，并且在 **Ubuntu 12.04** 下测试通过。

*   使用以下命令创建 /etc/init.d/ghost 文件：

    ```
    $ sudo curl https://raw.githubusercontent.com/TryGhost/Ghost-Config/master/init.d/ghost \
      -o /etc/init.d/ghost
    ```

*   使用 `nano /etc/init.d/ghost` 命令打开文件并检查以下内容：
*   将 `GHOST_ROOT` 变量的值更换为你的 Ghost 安装路径
*   检查 `DAEMON` 变量的值是否和 `which node` 的输出值相同
*   这个初始化脚本将在你的系统上以它自己的 Ghost 用户和用户组运行，使用以下命令来创建：

    ```
    $ sudo useradd -r ghost -U
    ```
    
*   确保 Ghost 用户可以访问安装目录：

    ```
    $ sudo chown -R ghost:ghost /你的 Ghost 安装目录
    ```

*   使用以下命令给这个初始化脚本加上可执行权限：

    ```
    $ sudo chmod 755 /etc/init.d/ghost
    ```

*   现在你可以使用以下的命令来控制 Ghost ：

    ```
    $ sudo service ghost start
    $ sudo service ghost stop
    $ sudo service ghost restart
    $ sudo service ghost status
    ```

*   为了让 Ghost 能在系统启动时同时启动，我们必须要将刚刚创建的初始化脚本注册为为启动项。
    执行以下两个命令：

    ```
    $ sudo update-rc.d ghost defaults
    $ sudo update-rc.d ghost enable
    ```
    
*   为了保证你的用户可以更改 Ghost 目录里的文件和默认的 config.js ，需要将你加入 ghost 用户组中：
    ```
    $ sudo adduser 你的用户名 ghost
    ```

*   如果你现在重启你的服务器，Ghost 应该会自动运行。

使用 forever 和如何在 ubuntu 下建立 Ghost 守护进程的文档即将发布！

## 配置 Ghost 域名

如果你已经让 Ghost 一直运行了，你也可以设置一个代理服务器让你的博客可以使用域名访问。以下的示例假定你的操作系统是 **Ubuntu 12.04** ，使用 **Nginx** 作为你的Web服务器，已经使用以上任意一种方法让 Ghost 在后台运行。

*   安装 nginx

    ```
    $ sudo apt-get install nginx
    ```
    <span class="note">这个命令将会安装nginx并且设定好所有必需的目录和基础配置。</span>
    
*   配置你的站点

    *   在 `/etc/nginx/sites-available` 创建一个 `ghost.conf` 文件
    *   使用文本编辑器打开这个文件 (e.g. `sudo nano /etc/nginx/sites-available/ghost.conf`)
        把以下内容复制进这个文件

        ```
        server {
            listen 80;
            server_name example.com;

            location / {
                proxy_set_header   X-Real-IP $remote_addr;
                proxy_set_header   Host      $http_host;
                proxy_pass         http://127.0.0.1:2368;
            }
        }

        ```

    *   将 `server_name` 的值改为你的域名
    *   把你的配置文件软链接到 `sites-enabled` 文件夹下:

    ```
    $ sudo ln -s /etc/nginx/sites-available/ghost.conf /etc/nginx/sites-enabled/ghost.conf
    ```

    *   重启 nginx

    ```
    $ sudo service nginx restart
    ```

