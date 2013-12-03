---
lang: da
layout: installation
meta_title: S&aring;dan installerer du Ghost p&aring; din server - Ghost dokumentation
meta_description: Alt du har behov for, for at f&aring; Ghost blogging platformen op og k&oslash;re p&aring; din lokale maskine eller hosting service.
heading: Installation af Ghost &amp; kom godt i gang
subheading: De f&oslash;rste trin til at oprette din nye blog for f&oslash;rste gang.
permalink: /da/installation/deploy/
chapter: installation
section: deploy
prev_section: linux
next_section: upgrading
---


## F&aring; Ghost live <a id="deploy"></a>

Er du klar til at f&aring; Ghost live? Perfekt!

Den f&oslash;rste beslutning du skal tr&aelig;ffe, er om du vil installere og s&aelig;tte Ghost op selv, eller om du foretr&aelig;kker at benytte et installationsprogram.

### Installationsprogram

Der er et par muligheder for simple installationsprogrammer i &oslash;jeblikket:

*   S&aelig;t det op i "skyen" med [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost).
*   K&oslash;r Ghost med [Rackspace deployments](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html).
*   F&aring; det op og k&oslash;re med [DigitalOcean Droplet](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application).

### Manuel ops&aelig;tning

Du skal bruge et webhotel, der allerede har eller tillader at du installerer [Node.js](http://nodejs.org).
    Det betyder plads i "skyen" ([Amazon EC2](http://aws.amazon.com/ec2/), [DigitalOcean](http://www.digitalocean.com), [Rackspace Cloud](http://www.rackspace.com/cloud/)), VPS ([Webfaction](https://www.webfaction.com/), [Dreamhost](http://www.dreamhost.com/servers/vps/)) eller andre webhoteller, som har SSH (terminal) adgang og tillader at du installerer Node.js. Der er mange muligheder og til billige penge.

Det er i øjeblikket i vil virke er et cPanel lignende webhotel på delt server, da det normalt er rettet specifikt mod understøttelse af PHP. Selvom nogle tilbyder Ruby og derfor måske tilbyder Node.js i fremtiden, da de lidt ens.

<p>Desværre er der mange Node-specifike hosting services i "skyen" som **Nodejitsu** og **Heroku**, som **IKKE** kan køre Ghost. Til at starte med vil det fungere, men de sletter dine filer og derfor vil alle uploadede billeder og din database forsvinde. Heroku understøtter MySQL som du kan benytte, men du vil stadig miste dine uploadede billeder.

Disse links indeholder vejledninger til hvordan du bliver kørende på:
The following links contain instructions on how to get up and running with:

*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - fra [howtoinstallghost.com](http://howtoinstallghost.com)
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - fra [Corbett Barr](http://ghosted.co)
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - fra [howtoinstallghost.com](http://howtoinstallghost.com)
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linux service) - fra [Gilbert Pellegrom](http://ghost.pellegrom.me/)
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - fra [Gregg Housh](http://0v.org/)
*   ...kig på [installation forum](https://en.ghost.org/forum/installation) for flere guides ...

## Få Ghost til at køre hele tiden

Den tidligere beskrevet metode for at starte Ghost er `npm start`. Det er en god måde at lave udvikling og tests lokalt, men hvis du starter Ghost via kommandolinje stopper det så snart du lukker terminalvinduet eller logger ud fra SSH. For at forhindre at Ghost stopper skal du køre Ghost som en service. Der er to måder at gøre det på.

### Forever ([https://npmjs.org/package/forever](https://npmjs.org/package/forever))

Du kan bruge `forever` til at køre Ghost som en "opgave" i baggrunden. `forever` tager sig også af din installation af Ghost og vil genstarte node processen, hvis den går ned.

*   For at installere `forever` skal du skrive `npm install forever -g`
*   For at starte Ghost ved hjælp af `forever` fra Ghost's installationsmappe skal du skrive `NODE_ENV=production forever start index.js`
*   For at stoppe Ghost skal du skrive `forever stop index.js`
*   For at kontrollere at Ghost kører skal du skrive `forever list`

### Supervisor ([http://supervisord.org/](http://supervisord.org/))

Populære Linux udgaver &mdash; som eks. Fedora, Debian og Ubuntu &mdash; veligeholder en udgave til Supervisor: Et process kontrol system, som tillader at du kan køre Ghost ved opstart uden brug af init scripts. I modsætning til et init script er Supervisor er flytbar mellem Linux udgaver og versioner.

*   [Install&eacute;r Supervisor](http://supervisord.org/installing.html) som krævet af din Linux udgave. Det vil typiske være:
    *   Debian/Ubuntu: `apt-get install supervisor`
    *   Fedora: `yum install supervisor`
    *   De fleste andre udgaver: `easy_install supervisor`
    *   For at kontrollere at Supervisor kører skal du skrive `service supervisor start`
    *   Opret opstarts scriptet til din Ghost installation. Typisk vil det indsættes i `/etc/supervisor/conf.d/ghost.conf` Eksempelvis:

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

*   Start Ghost ved hjælp af Supervisor: `supervisorctl start ghost`
*   For t stoppe Ghost: `supervisorctl stop ghost`

Du kan kigge i [Supervisor's dokumentation](http://supervisord.org) for flere informationer.

### Init Script

Linux systems use init scripts to run on system boot. These scripts exist in /etc/init.d. To make Ghost run forever and even survive a reboot you could set up an init script to accomplish that task. The following example will work on Ubuntu and was tested on **Ubuntu 12.04**.

*   Create the file /etc/init.d/ghost with the following content:

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

*   Change the execution permission for the init script by typing
        `chmod 755 /etc/init.d/ghost`
*   Use the script:

    *   start: `service ghost start`
    *   stop: `service ghost stop`
    *   restart: `service ghost restart`
    *   status: `service ghost status`
*   To start Ghost on system start the newly created init script has to be registered for start up. Type the following two commands in command line: `update-rc.d ghost defaults` and `update-rc.d ghost enable`

Documentation on using node forever, and how to daemonize Ghost on ubuntu coming very soon!

## Setting up Ghost with a domain name

Documentation on using nginx as a reverse proxy on their way.

