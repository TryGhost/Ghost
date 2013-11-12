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

*   创建 /etc/init.d/ghost 文件，添加以下内容：

    ```
    #! /bin/sh
    ### BEGIN INIT INFO
    # Provides:          ghost
    # Required-Start:    $network $syslog
    # Required-Stop:     $network $syslog
    # Default-Start:     2 3 4 5
    # Default-Stop:      0 1 6
    # Short-Description: Ghost Blogging Platform
    # Description:       Ghost: Just a blogging platform
    ### END INIT INFO

    # Do NOT "set -e"

    # PATH should only include /usr/* if it runs after the mountnfs.sh script
    PATH=/sbin:/usr/sbin:/bin:/usr/bin
    DESC="Ghost"
    NAME=ghost
    GHOST_ROOT=/var/www/ghost
    GHOST_GROUP=ghost
    GHOST_USER=ghost
    DAEMON=/usr/bin/node
    DAEMON_ARGS="$GHOST_ROOT/index.js"
    PIDFILE=/var/opt/ghost/run/$NAME.pid
    SCRIPTNAME=/etc/init.d/$NAME
    export NODE_ENV=production

    # Exit if the package is not installed
    [ -x "$DAEMON" ] || exit 0

    # Read configuration variable file if it is present
    [ -r /etc/default/$NAME ] && . /etc/default/$NAME

    # Load the VERBOSE setting and other rcS variables
    . /lib/init/vars.sh
    # I like to know what is going on
    VERBOSE = yes

    # Define LSB log_* functions.
    # Depend on lsb-base (>= 3.2-14) to ensure that this file is present
    # and status_of_proc is working.
    . /lib/lsb/init-functions

    #
    # Function that starts the daemon/service
    #
    do_start()
    {
        # Set up folder structure
        mkdir -p /var/opt/ghost
        mkdir -p /var/opt/ghost/run
        chown -R ghost:ghost /var/opt/ghost
        # Return
        #   0 if daemon has been started
        #   1 if daemon was already running
        #   2 if daemon could not be started
        start-stop-daemon --start --quiet \
            --chuid $GHOST_USER:$GHOST_GROUP --chdir $GHOST_ROOT --background \
            --pidfile $PIDFILE --exec $DAEMON --test > /dev/null \
            || return 1
        start-stop-daemon --start --quiet \
            --chuid $GHOST_USER:$GHOST_GROUP --chdir $GHOST_ROOT --background \
            --pidfile $PIDFILE --exec $DAEMON -- $DAEMON_ARGS \
            || return 2
        # Add code here, if necessary, that waits for the process to be ready
        # to handle requests from services started subsequently which depend
        # on this one.  As a last resort, sleep for some time.
    }

    #
    # Function that stops the daemon/service
    #
    do_stop()
    {
        # Return
        #   0 if daemon has been stopped
        #   1 if daemon was already stopped
        #   2 if daemon could not be stopped
        #   other if a failure occurred
        start-stop-daemon --stop --quiet --retry=TERM/30/KILL/5 \
            --pidfile $PIDFILE --name $NAME
        RETVAL="$?"
        [ "$RETVAL" = 2 ] && return 2
        # Wait for children to finish too if this is a daemon that forks
        # and if the daemon is only ever run from this initscript.
        # If the above conditions are not satisfied then add some other code
        # that waits for the process to drop all resources that could be
        # needed by services started subsequently.  A last resort is to
        # sleep for some time.
        start-stop-daemon --stop --quiet --oknodo --retry=0/30/KILL/5 \
            --exec $DAEMON
        [ "$?" = 2 ] && return 2
        # Many daemons don't delete their pidfiles when they exit.
        rm -f $PIDFILE
        return "$RETVAL"
    }

    #
    # Function that sends a SIGHUP to the daemon/service
    #
    do_reload() {
        #
        # If the daemon can reload its configuration without
        # restarting (for example, when it is sent a SIGHUP),
        # then implement that here.
        #
        start-stop-daemon --stop --signal 1 --quiet --pidfile $PIDFILE \
            --name $NAME
        return 0
    }

    case "$1" in
    start)
            [ "$VERBOSE" != no ] && log_daemon_msg "Starting $DESC" "$NAME"
            do_start
            case "$?" in
                    0|1) [ "$VERBOSE" != no ] && log_end_msg 0 ;;
                    2) [ "$VERBOSE" != no ] && log_end_msg 1 ;;
            esac
            ;;
    stop)
            [ "$VERBOSE" != no ] && log_daemon_msg "Stopping $DESC" "$NAME"
            do_stop
            case "$?" in
                    0|1) [ "$VERBOSE" != no ] && log_end_msg 0 ;;
                    2) [ "$VERBOSE" != no ] && log_end_msg 1 ;;
            esac
            ;;
    status)
        status_of_proc "$DAEMON" "$NAME" && exit 0 || exit $?
        ;;
    #reload|force-reload)
            #
            # If do_reload() is not implemented then leave this commented out
            # and leave 'force-reload' as an alias for 'restart'.
            #
            #log_daemon_msg "Reloading $DESC" "$NAME"
            #do_reload
            #log_end_msg $?
            #;;
    restart|force-reload)
            #
            # If the "reload" option is implemented then remove the
            # 'force-reload' alias
            #
            log_daemon_msg "Restarting $DESC" "$NAME"
            do_stop
            case "$?" in
            0|1)
                    do_start
                    do_start
                    case "$?" in
                            0) log_end_msg 0 ;;
                            1) log_end_msg 1 ;; # Old process is still running
                            *) log_end_msg 1 ;; # Failed to start
                    esac
                    ;;
            *)
                    # Failed to stop
                    log_end_msg 1
                    ;;
            esac
            ;;
    *)
            #echo "Usage: $SCRIPTNAME {start|stop|restart|reload|force-reload}" >&2
            echo "Usage: $SCRIPTNAME {start|stop|status|restart|force-reload}" >&2
            exit 3
            ;;
    esac

    :
    ```

*   输入 `chmod 755 /etc/init.d/ghost` 改变初始化脚本的执行权限。
*   使用脚本：

    *   启动： `service ghost start`
    *   停止： `service ghost stop`
    *   重启： `service ghost restart`
    *   状态： `service ghost status`
*   为了在系统启动时运行 Ghsot ，新创建的初始化脚本必须注册为启动项。在命令行中输入： `update-rc.d ghost defaults` 和 `update-rc.d ghost enable`

使用 forever 和如何在 ubuntu 下建立 Ghost 守护进程的文档即将发布！

## 配置 Ghost 域名

使用 nginx 做反向代理的文档也即将发布。

