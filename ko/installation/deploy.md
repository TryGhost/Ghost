---
lang: ko
layout: installation
meta_title: 서버에 Ghost 설치하기 - Ghost 한국어 가이드
meta_description: 블로깅 플래폼 Ghost를 여러분의 로컬 및 원격에서 설정하는 방법입니다. 
heading: Ghost 설치 시작하기
subheading: 여러분의 새로운 블로그를 설정하기 위한 첫 번째 단계입니다.
permalink: /ko/installation/deploy/
chapter: installation
section: deploy
prev_section: linux
next_section: upgrading
---

## Ghost 시작하기 <a id="deploy"></a>

Ghost 사용을 시작할 준비가 되셨나요? 좋습니다!

가장 먼저 생각해야 할 것은, 여러분이 설치 과정을 직접할 것인가 아니면 자동 설치도구(Installer)의 도움을 받을 것인가를 결정하는 것입니다. 

### 자동설치도구(Installers)

간편한 자동설치도구로 아래와 같은 방법이 있습니다. 

*   [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost)를 사용하여 클라우드에 Deploy하기
*   [Rackspace deployments](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html)를 사용하여 Ghost 실행
*   [DigitalOcean Droplet](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application) 사용하기

### 수동 설치

Ghost를 사용하기 위해서는 호스팅 서비스가 [Node.js](http://nodejs.org)를 이미 지원하고 있거나 사용자가 원할 때 사용할 수 있도록 허락하는지 확인해야 합니다.

다시 말해서 클라우드 서비스([Amazon EC2](http://aws.amazon.com/ec2/), [DigitalOcean](http://www.digitalocean.com), [Rackspace Cloud](http://www.rackspace.com/cloud/)), 가상사설서버VPS ([Webfaction](https://www.webfaction.com/), [Dreamhost](http://www.dreamhost.com/servers/vps/)), 또는 SSH (터미널) 접속이 가능하면서 Node.js 설치가 가능한 서비스에 Ghost를 설치할 수 있습니다. 둘러보면 지원하는 곳이 꽤 많이 있고 사용료도 저렴한 편입니다.

현재 컨트롤패널(cPanel)을 사용하는 공유 호스팅 서비스에는 Ghost 설치가 불가능한데, 보통 이런 서비스들은 PHP만을 지원하기 때문이죠. 이런 호스팅 서비스 중에 가끔 Ruby를 지원하는 경우가 더러 있는데, 어느정도 비슷한 Node.js 를 장래에 혹시 지원해줄 가능성이 있기는 합니다.

<p>아쉽게도, **Nodejitsu**라든가 **Heroku**와 같은 Node 전용 호스팅 서비스는 Ghost와 **호환이 되지 않습니다.** 설치 후에 작동은 될테지만, 이내 파일과 이미지가 모두 삭제되고 데이터베이스가 사라질 것입니다. Heroku는 MySQL를 지원하므로 데이터를 보존할 수 있을지는 몰라도, 업로드한 이미지는 모두 삭제될 겁니다.

아래 링크를 참고하면 각 서비스에서 Ghost를 어떻게 설치하는지 자세히 알아볼 수 있습니다.

*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - 출처: [howtoinstallghost.com](http://howtoinstallghost.com)
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - 출처: [Corbett Barr](http://ghosted.co)
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - 출처: [howtoinstallghost.com](http://howtoinstallghost.com)
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linux service) - 출처: [Gilbert Pellegrom](http://ghost.pellegrom.me/)
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - 출처: [Gregg Housh](http://0v.org/)
*   ... [설치과정 관련 게시판installation forum](https://en.ghost.org/forum/installation)에도 참고할 정보가 있습니다.

## Ghost 접속상태 유지하기

지금까지 설명한 Ghost 설치 방법은 'npm start'입니다. 이것은 로컬에서 프로그램을 개발하고 테스트해보기에는 좋은 방법이지만, 도스창에서 커맨드라인 입력하는 방식으로 Ghost를 시동하게 되면 여러분이 터미널 창을 종료하거나 SSH 접속을 종료할 때마다 Ghost는 작동을 중단하게 될 겁니다. Ghost가 중단되지 않도록 하기 위해서 여러분은 Ghost를 하나의 서비스로 운영해야 하죠. 방법은 두 가지가 있습니다. 


### Forever ([https://npmjs.org/package/forever](https://npmjs.org/package/forever))

여러분은 `forever`를 이용하면 Ghost를 일종의 백그라운드 작업으로 사용할 수 있게 됩니다. `forever`는 또한 Ghost의 설치작업을 처리하고 node 작업이 실패하면 다시 시작하는 역할까지 맡아서 할 겁니다. 

*  `forever`를 설치하기 위해서 `npm install forever -g`라고 타이핑을 하세요. 
*   Ghost 설치폴더에서 `forever`를 사용하여 Ghost를 시작하려면 `NODE_ENV=production forever start index.js`라고 타이핑하세요.
*   Ghost를 종료하려면 `forever stop index.js`라고 타이핑하세요.
*   현재 Ghost가 실행되고 있는지 확인하려면 `forever list`라고 타이핑하세요.

### Supervisor ([http://supervisord.org/](http://supervisord.org/))

Fedora, Debian, Ubuntu와 같은 유명 리눅스 배포판에 계속 포함되어 있는 것이 감시자(Supervisor) 패키지입니다. 이것은 프로세스 컨트롤 시스템으로서 init 스크립트 없이 부팅하면서 Ghost가 실행되도록 해주지요. init script와 달리, Supervisor는 리눅스 배포판이나 버전을 가리지 않고 바로 옮겨서 사용 가능합니다. 

*   [Supervisor를 설치](http://supervisord.org/installing.html)합니다. 현재 리눅스 버전을 확인하세요. 일반적으로, 아래를 참고하면 됩니다:
    *   Debian/Ubuntu: `apt-get install supervisor`
    *   Fedora: `yum install supervisor`
    *   기타 리눅스 배포판: `easy_install supervisor`
*   Supervisor가 구동되고 있는지 확인하세요. `service supervisor start`를 실행하세요.
*  Ghost 설치를 위한 startup 스크립트를 작성합니다. 대개  `/etc/supervisor/conf.d/ghost.conf`에 다음과 같이 씁니다:

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

*   Supervisor를 사용하여 Ghost 시작하기: `supervisorctl start ghost`
*   Ghost 중지하기: `supervisorctl stop ghost`

더 자세한 내용은 [documentation for Supervisor](http://supervisord.org) 문서를 참고하세요.

### Init Script

리눅스 시스템은 부팅 시에 init script를 실행하도록 되어 있습니다. 이 스크립트들은 /etc/init.d 디렉토리에 위치합니다. Ghost를 상시 구동하도록 만들고 리부팅 되더라도 종료되지 않도록 하려면 init script를 수정하여 바로 그러한 일을 하도록 설정해주어야 합니다. 아래 스크립트 예시는 우분투에 사용될 스크립트이고 **Ubuntu 12.04**에서 테스트되었습니다.

*  아래 내용을 넣어 /etc/init.d/ghost 라는 파일을 만들어주세요.

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

*   위의 init script의 실행 퍼미션을 755로 조정하기 위해 다음과 같이 타이핑합니다. 
        `chmod 755 /etc/init.d/ghost`
*   스크립트 실행하기:

    *   실행: `service ghost start`
    *   중지: `service ghost stop`
    *   재실행: `service ghost restart`
    *   상태체크: `service ghost status`
*   Ghost가 시스템 부팅 시에 실행되도록 하려면 새로 작성한 init script가 등록되어 있어야 합니다. 아래 두 가지의 명령을 커맨드 라인에 타이핑하여 실행하세요. : `update-rc.d ghost defaults` 그리고 `update-rc.d ghost enable`

node를 항상 사용하도록 하는 방법과, 우분투에서 Ghost를 데몬Daemon으로 사용하는 방법(백그라운드 구동)에 관한 가이드 문서를 곧 공개하겠습니다!

## Ghost에 도메인명 설정하기

nginx를 역프록시(reverse proxy)로 사용하는 가이드 문서도 곧 올라옵니다.
