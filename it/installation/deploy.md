---
lang: it
layout: installation
meta_title: Come installare Ghost sul tuo server - Documentazione Ghost
meta_description: Tutto il necessario per far funzionare la piattaforma di blogging Ghost in locale e in remoto.
heading: Installazione di Ghost &amp; Primi passi
subheading: I primi passi per installare il tuo nuovo blog per la prima volta.
permalink: /it/installation/deploy/
chapter: installation
section: deploy
prev_section: linux
next_section: upgrading
---

## Scaricare Ghost <a id="deploy"></a>

Dunque sei pronto a scaricare Ghost? Eccellente!

La prima decisione da prendere è se vuoi installare Ghost manualmente o se preferisci usare un'installer.

### Installers

Al momento le alternative con installers semplici da usare sono principalmente:

*   Rilasciare sul cloud di [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost).
*   Avviare Ghost tramite [Rackspace deployments](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html).
*   Configurare [DigitalOcean Droplet](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application).

### Installazione Manuale

Hai bisogno di un servizio di hosting che abbia o ti permetta di installare [Node.js](http://nodejs.org).
    Ciò significa qualcosa come un cloud ([Amazon EC2](http://aws.amazon.com/ec2/), [DigitalOcean](http://www.digitalocean.com), [Rackspace Cloud](http://www.rackspace.com/cloud/)), VPS ([Webfaction](https://www.webfaction.com/), [Dreamhost](http://www.dreamhost.com/servers/vps/)) o altri pacchetti con accesso SSH (terminale) e che ti permettano di installare Node.js. Ne esistono molti, alcuni molto economici.

Attualmente non sono utilizzabili hosting condivisi stile cPanel in quanto solitamente concepiti per hosting PHP. Sebbene alcuni offrano Ruby, dunque in futuro potrebbero offrire Node.js essendo simili.

<p>Sfortunatamente molte delle soluzioni di cloud non designate specificatamente per Node, come **Nodejitsu** o **Heroku**, **NON** sono compatibili con Ghost. Funzionano inizialmente, ma cancellano i tuoi files, dunque tutte le immagini caricate e il database scompaiono. Heroku supporta MySQL quindi potresti adoperarlo, ma perderesti ugualmente le immagini caricate.

I seguenti links contengono istruzioni su come configurare:

*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - da [howtoinstallghost.com](http://howtoinstallghost.com)
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - da [Corbett Barr](http://ghosted.co)
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - da [howtoinstallghost.com](http://howtoinstallghost.com)
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linux service) - da [Gilbert Pellegrom](http://ghost.pellegrom.me/)
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - da [Gregg Housh](http://0v.org/)
*   ...visita la [sezione installazioni del forum](https://en.ghost.org/forum/installation) per altre guide...

## Rendere Ghost permanente

Il metodo precedentemente descritto per avviare Ghost è `npm start`. É valido  per sviluppare localmente e per testare, tuttavia avviare Ghost da riga di comando implica interromperne l'erogazione una volta chiuso il terminale o la sessione SSH. Per evitare che Ghost si interrompa occorre eseguirlo come servizio. Ci sono due modi per arrivare a questo risultato.

### Forever ([https://npmjs.org/package/forever](https://npmjs.org/package/forever))

Puoi eseguire `forever` per lanciare Ghost come processo in background. `forever` si occuperà anche della tua installazione di Ghost e riavvierà il processo node in caso di crash.

*   Per installare `forever` digita `npm install forever -g`
*   Per lanciare Ghost usando `forever` dalla cartella di installazione di Ghost digita `NODE_ENV=production forever start index.js`
*   Per fermare Ghost digita `forever stop index.js`
*   Per verificare che Ghost sia avviato digita `forever list`

### Supervisor ([http://supervisord.org/](http://supervisord.org/))

Popolari distro Linux &mdash;come Fedora, Debian e Ubuntu&mdash; dispongono di un pacchetto per Supervisor: un sistema di controllo dei processi che consente di avviare Ghost all'avvio senza usare alcuno script di init. Al contrario degli scripts di init, Supervisor è portabile tra distro Linux e versioni diverse.

*   [Installare Supervisor](http://supervisord.org/installing.html) varia a seconda della distro Linux. Tipicamente:
    *   Debian/Ubuntu: `apt-get install supervisor`
    *   Fedora: `yum install supervisor`
    *   La maggior parte delle altre distro: `easy_install supervisor`
*   Verifica che Supervisor sia in esecuzione eseguendo `service supervisor start`
*   Crea lo script d'avvio per la tua installazione di Ghost. Tipicamente andrà in `/etc/supervisor/conf.d/ghost.conf` Per esempio:

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

*   Per lanciare Ghost usando Supervisor: `supervisorctl start ghost`
*   Per fermare Ghost: `supervisorctl stop ghost`

Puoi consultare la [documentazione di Supervisor](http://supervisord.org) per ulteriori informazioni.

### Init Script

I sistemi Linux usano scripts di init per avviare al boot del sistema. Questi scripts sono presenti in /etc/init.d. Per rendere Ghost permanente anche in caso di riavvio puoi utilizzare uno script di init. L'esempio seguente funziona con Ubuntu ed è stato testato con **Ubuntu 12.04**.

*   Crea il file /etc/init.d/ghost col seguente codice al suo interno:

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

*   Modifica i permessi d'esecuzione per lo script di init digitando
        `chmod 755 /etc/init.d/ghost`
*   Usa lo script:

    *   start: `service ghost start`
    *   stop: `service ghost stop`
    *   restart: `service ghost restart`
    *   status: `service ghost status`
*   Per lanciare Ghost all'avvio del sistema lo script di init appena creato dev'essere registrato opportunamente. Da terminale digita i seguenti due comandi: `update-rc.d ghost defaults` e `update-rc.d ghost enable`

Presto sarà rilasciata documentazione sull'uso permanente di node e su come creare il demone di Ghost su ubuntu!

## Configurare Ghost con un nome di dominio

Documentazione su come usare nginx in qualità di reverse proxy è in lavorazione.

