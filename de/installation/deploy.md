---
lang: de
layout: installation
meta_title: Ghost auf deinem Server installieren - Ghost-Dokumentation
meta_description: Alles was du wissen musst um deinen Ghost Blog lokal oder auf deinem Server starten zu können.
heading: Ghost installieren &amp; Erste Schritte
subheading: Was getan werden muss, um deinen neuen Blog zum ersten mal einzurichten.
permalink: /de/installation/deploy/
chapter: installation
section: deploy
prev_section: linux
next_section: upgrading
---

## Ghost einsetzen

Du willst Ghost also einsetzen? Ausgezeichnet!

Die erste Entscheidung, die du zu treffen hast, ist ob du Ghost selbst installieren und einrichten oder ob du ein Installationsprogramm nutzen willst.

### Installationsprogramme

Im moment gibt es eine Reihe an einfachen Installationsprogrammen.

* Ghost in der Cloud bei [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost).
* Ghost mittels [Rackspace deployments](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html) betreiben.
* Ein [DigitalOcean Droplet](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application) verwenden.

### Manuelle Einrichtung

Dies erfordert einen Hosting-Account der bereits [Node.js](http://nodejs.org) beherrscht oder es zur Installation anbietet. Viele Cloud-Dienste ([Amazon EC2](http://aws.amazon.com/ec2/), [DigitalOcean](http://www.digitalocean.com), [Rackspace Cloud](http://www.rackspace.com/cloud/)), VPS ([Webfaction](https://www.webfaction.com/), [Dreamhost](http://www.dreamhost.com/servers/vps/)) oder andere Pakete mit SSH-Zugang ermöglichen die installation von Node.js. Es gibt viele Anbieter und einige sind sehr günstig.

Was momentant nicht unterstützt wird, ist Shared-Hosting im Stil von cPanel, welches normalerweise ausschließlich PHP bietet. Wer jedoch bereits heute Ruby unterstützt, wird möglicherweise in Zukunft auch Node.js untersützten, da diese gewissermaßen ähnlich sind.

Leider sind viele der Node.js Cloud-Hosting-Dienste wie **Nodejitsu** und **Heroku**  **NICHT** kompatibel mit Ghost. Zwar lässt sich Ghost auf ihnen starten, sie löschen allerdings deine Dateien und somit auch alle hochgeladenen Bilder und die Datenbank. Heroku unterstützt MySQL und lässt sich somit verwenden, Bilder bleiben dennoch nicht permanent erhalten.

Die folgenden Links enthalten Anleitungen, die die Einrichtung beschreiben:

*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - from [howtoinstallghost.com](http://howtoinstallghost.com)
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - from [Corbett Barr](http://ghosted.co)
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - from [howtoinstallghost.com](http://howtoinstallghost.com)
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linux service) - from [Gilbert Pellegrom](http://ghost.pellegrom.me/)
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - from [Gregg Housh](http://0v.org/)
*   ...check the [installation forum](https://en.ghost.org/forum/installation) for more guides ...

## Ghost ununterbrochen ausführen


Bisher wurde Ghost mit `npm start` gestartet. Das ist der beste Weg für lokale Entwicklung oder Tests, sobald du allerdings das Terminal beendest oder dich aus SSH ausloggest, wird Ghost auch beendet. Um das zu verhindern, musst du Ghost als Dienst ausführen, wofür es mehrere Wege gibt.

### Forever ([https://npmjs.org/package/forever](https://npmjs.org/package/forever))

Du kannst `forever` nutzen, um Ghost als Hintergrunddienst zu betreiben. `forever` kümmert sich um deine Ghost-Installation und startet sie neu, falls der Node-Prozess durch einen Fehler beendet wird.

* Um `forever` zu installieren, verwende `npm install forever -g`
* Um Ghost zu starten, wechsle in das Ghost-Verzeichnis und führe `NODE_ENV=production forever start index.js` aus
* Um Ghost zu stoppen, führe `forever stop index.js` aus
* Um herauszufunden ob Ghost momentan läuft, führe `forever list` aus

### Supervisor ([http://supervisord.org/](http://supervisord.org/))

Beliebte Linux-Distributionen wie Fedora, Debian und Ubuntu bieten ein Paket für Supervisor: Eine Prozessverwaltung die es ermöglicht Ghost ohne herkömmliche Init-Scripte beim Systemstart auszuführen. Anders als ein Init-Script ist Supvervisor über verschiedene Distrubitionen und Kernel-Versionen hinweg portabel.

*   [Installiere Supervisor](http://supervisord.org/installing.html) für deine Linux-Distribution. Meistens geht das über:
    *   Debian/Ubuntu: `apt-get install supervisor`
    *   Fedora: `yum install supervisor`
    *   Meiste andere Distributionen: `easy_install supervisor`
*   Mit dem Befehl `service supervisor start` stellst du sicher, dass Supervisor läuft
*   Erstelle das Start-Script für deine Ghost-Installation. Normalerweise gehört dies in `/etc/supervisor/conf.d/ghost.conf` Beispielsweise:

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

*   Um Ghost mittels Supervisor zu starten, verwende `supervisorctl start ghost`
*   Um Ghost zu stoppen: `supervisorctl stop ghost`

Für weitere Informationen kannst du einen Blick in die [Dokumentation von Supervisor](http://supervisord.org) werfen.

### Init Script

Linux-Systeme führen Init-Scripte beim Systemstart aus. Sie liegen in /etc/init.d. Um Ghost ununterbrochen auszuführen, sogar über einen Neustart hinweg, kannst du ein Init-Script einrichten. Das folgende Beispiel funktioniert unter Ubuntu und wurde unter **Ubuntu 12.04** getestet.

*   Lege die Datei /etc/init.d/ghost mit folgendem Inhalt an:

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

*   Setze die korrekten Rechte mit dem Befehl
        `chmod 755 /etc/init.d/ghost`
*   Verwendung des Scripts:

    *   start: `service ghost start`
    *   stop: `service ghost stop`
    *   restart: `service ghost restart`
    *   status: `service ghost status`
*   Um Ghost beim Systemstart automatisch zu starten, muss das Init-Script entsprechend registriert werden. Das geht mit den Befehlen `update-rc.d ghost defaults` und `update-rc.d ghost enable`

Weitere Dokumentation darüber, wie node mit forever verwendet wird und wie man Ghost als daemon unter Ubuntu betreibt, werden sehr bald hinzugefügt!

## Ghost mit einer Domain betreiben

Dokumentation, wie man nginx als reverse proxy verwendet, ist in Arbeit.
