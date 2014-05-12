---
lang: ko
layout: installation
meta_title: 서버에 Ghost 설치하기 - Ghost 가이드
meta_description: Ghost 플랫폼을 이용하여 블로그를 만들기 위한 가이드입니다.
heading: Ghost 설치 및 실행
subheading: Ghost로 새 블로그를 만들기 위해 진행해야 할 것들
permalink: /ko/installation/deploy/
chapter: installation
section: deploy
prev_section: linux
next_section: upgrading
---

## Ghost 배포 <a id="deploy"></a>

Ghost를 배포하실 준비가 되셨나요?

Ghost를 배포하는 방법에는 크게 2가지 방법이 있습니다. 첫째는 Ghost 설치 프로그램을 이용하는 방법이고, 둘째는 직접 수동으로 설치 및 설정하는 방법입니다.

### 설치 프로그램을 이용하여 Ghost 배포

현재 이용하실 수 있는 Ghost 설치 프로그램은 다음과 같습니다.

*   [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost)
*   [Rackspace deployments](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html)
*   [DigitalOcean Droplet](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application)

### 수동으로 설치 및 설정하여 Ghost 배포

[Node.js](http://nodejs.org)가 이미 설치되어 있거나 설치가 허용되는 호스팅 서비스를 사용하셔야 합니다.
    클라우드 서비스([Amazon EC2](http://aws.amazon.com/ec2/), [DigitalOcean](http://www.digitalocean.com), [Rackspace Cloud](http://www.rackspace.com/cloud/))나 VPS 서비스([Webfaction](https://www.webfaction.com/), [Dreamhost](http://www.dreamhost.com/servers/vps/))와 같은 SSH (터미널) 액세스가 지원되고 Node.js를 설치할 수 있는 서비스라면 어떤 서비스이든 가능합니다. 이를 지원하는 서비스는 많으며 저렴하게 이용할 수 있습니다.

cPanel을 이용하여 관리하는 호스팅 서비스는 대부분 PHP를 호스팅하기 위해 만들어졌기 때문에 지원되지 않습니다. Ruby를 지원하기 시작한 몇몇 서비스도 있는 것을 보면 Node.js도 곧 지원될지도 모릅니다.

불가피하게도 **Nodejitsu**나 **Heroku**와 같은 많은 Node 전용 클라우드 호스팅 서비스는 현재 지원되지 않습니다. Ghost의 실행은 가능하지만, 파일의 저장이 지원되지 않아 모든 데이터베이스와 이미지 파일이 삭제되기 때문입니다. Heroku는 MySQL을 지원하기 때문에 이를 사용할 수 있지만 업로드된 이미지가 삭제되는 문제가 있습니다.

다음 링크는 클라우드 서비스에서 어떻게 Ghost를 배포할 수 있는지를 설명합니다.

*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - [howtoinstallghost.com](http://howtoinstallghost.com)가 작성
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - [Corbett Barr](http://ghosted.co)가 작성
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - [howtoinstallghost.com](http://howtoinstallghost.com)가 작성
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linux service) - [Gilbert Pellegrom](http://ghost.pellegrom.me/)가 작성
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - [Gregg Housh](http://0v.org/)가 작성
*   ...더 많은 가이드를 위해서 [installation forum](https://en.ghost.org/forum/installation)을 참조해 보세요 ...

## 영구적으로 Ghost 실행

이전에 소개한 Ghost를 실행하는 방법은 `npm start`를 사용하는 방법이었습니다. 이 방법은 로컬 환경에서 개발 및 테스트를 할 때에는 좋은 방법이지만 프로덕션 환경에서는 좋은 방법이 아닙니다. 터미널 창을 닫거나 SSH로부터 로그아웃하면 Ghost가 종료되어 버리기 때문입니다. Ghost의 종료를 막기 위해서는 Ghost를 서비스로서 실행하셔야 합니다. Ghost를 서비스로 실행하는 방법에는 두 가지 방법이 있습니다.

### Forever ([https://npmjs.org/package/forever](https://npmjs.org/package/forever)) <a id="forever"></a>

Ghost를 백그라운드 작업으로 실행하기 위해 `forever`를 사용할 수 있습니다. `forever`는 또한 Ghost가 충돌으로 인해 종료되었을 때 다시 실행해 줍니다.

*   `forever`를 설치하시려면 `npm install forever -g`를 입력하세요.
*   `forever`를 이용하여 Ghost를 실행하시려면 Ghost 설치 디렉토리에서 `NODE_ENV=production forever start index.js`를 입력하세요.
*   Ghost를 종료하시려면 `forever stop index.js`를 입력하세요.
*   Ghost가 현재 실행 중인지 확인하시려면 `forever list`를 입력하세요.

### Supervisor ([http://supervisord.org/](http://supervisord.org/)) <a id="supervisor"></a>

Fedora, Debian, Ubuntu와 같은 많이 사용되는 Linux 배포판에는 Supervisor라는 패키지가 있습니다. Supervisor는 프로세스 관리 시스템으로 init 스크립트의 사용 없이 Ghost를 실행할 수 있도록 해 줍니다. init 스크립트와 달리, Supervisor 스크립트를 작성하는 방법은 Linux 배포판 및 버전에 상관없이 동일합니다.

*   [Supervisor를 설치](http://supervisord.org/installing.html)하세요. 각 Linux 배포판에 따른 설치 방법은 다음과 같습니다.
    *   Debian/Ubuntu: `apt-get install supervisor`
    *   Fedora: `yum install supervisor`
    *   다른 대부분의 Linux 배포판: `easy_install supervisor`
*   `service supervisor start`를 실행하셔서 Supervisor가 실행되어 있는지 확인하세요.
*   Ghost 시작 스크립트를 작성하세요. 대체로 이는 `/etc/supervisor/conf.d/ghost.conf`에 다음과 같이 작성합니다.

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

*   Supervisor로 Ghost를 실행하시려면 `supervisorctl start ghost`를 입력하세요.
*   Ghost를 종료하시려면 `supervisorctl stop ghost`를 입력하세요.

더 자세한 내용은 [documentation for Supervisor](http://supervisord.org) 문서를 참고하세요.

### Init 스크립트 <a id="init-script"></a>

리눅스 시스템은 부팅 시에 init script를 실행하도록 되어 있습니다. 이 스크립트들은 /etc/init.d 디렉토리에 위치합니다. Ghost를 상시 구동하도록 만들고 리부팅 되더라도 종료되지 않도록 하려면 init script를 수정하여 바로 그러한 일을 하도록 설정해주어야 합니다. 아래 스크립트 예시는 우분투에 사용될 스크립트이고 **Ubuntu 12.04**에서 테스트되었습니다.

*   다음 명령어를 이용하여 /etc/init.d/ghost 파일을 만드세요.

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

*   다음 명령어를 입력하여 init 스크립트의 실행 권한을 수정하세요.

    ```
    $ sudo chmod 755 /etc/init.d/ghost
    ```

*   이제 다음 명령어를 이용하여 Ghost를 관리할 수 있습니다.

    ```
    $ sudo service ghost start
    $ sudo service ghost stop
    $ sudo service ghost restart
    $ sudo service ghost status
    ```

*   Ghost가 부팅 시 실행되도록 하려면 시작 스크립트에 등록해야 합니다. 다음 두 명령어를 커맨드 라인에 입력하세요:

    ```
    $ sudo update-rc.d ghost defaults
    $ sudo update-rc.d ghost enable
    ```

node를 항상 사용하도록 하는 방법과, 우분투에서 Ghost를 데몬Daemon으로 사용하는 방법(백그라운드 구동)에 관한 가이드 문서를 곧 공개하겠습니다!

## Ghost에 도메인명 설정하기

nginx를 역프록시(reverse proxy)로 사용하는 가이드 문서도 곧 올라옵니다.
