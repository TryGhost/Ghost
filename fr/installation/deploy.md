---
lang: fr
layout: installation
meta_title: Comment installer Ghost sur votre serveur - Doc Ghost
meta_description: Tout ce que vous devez savoir pour faire fonctionner votre plateforme de blog Ghost sur votre environnement local ou distant.
heading: Installation de Ghost &amp; Démarrage
subheading: Premières étapes pour paramétrer votre nouveau blog pour la première fois.
permalink: /fr/installation/deploy/
chapter: installation
section: deploy
prev_section: linux
next_section: upgrading
---

## Mettre en place Ghost <a id="deploy"></a>

Vous êtes prêts à mettre en place Ghost ? Excellent !

La première décision que vous devez faire est de savoir si voulez installer et configurer Ghost vous-même, ou si vous préférez utiliser un installateur.

### Installateurs

Il y a plusieurs options pour installer simplement Ghost :

*   Déployer sur le cloud avec [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost).
*   Lancer Ghost avec [des déploiements Rackspace](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html).
*   Être opérationnel avec un [Droplet DigitalOcean](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application).

### Paramétrage manuel

Vous allez avoir besoin d'un hébergement qui dispose déjà ou vous permet d'installer [Node.js](http://nodejs.org).
    C'est à dire quelque chose comme une instance ([Amazon EC2](http://aws.amazon.com/ec2/), [DigitalOcean](http://www.digitalocean.com), [Rackspace Cloud](http://www.rackspace.com/cloud/)), VPS ([Webfaction](https://www.webfaction.com/), [Dreamhost](http://www.dreamhost.com/servers/vps/)) ou n'importe quel autre hébergement disposant du'un accès SSH et qui vous permet d'installer Node.js. Il en existe beaucoup et ils peuvent être peu chers.

Ce qui ne fonctionnera pas pour le moment, ce sont les hébergements mutualisés dans le style cPanel, qui sont habituellement spécifiques à l'hébergement de fichiers PHP. Malgré tout, certains de ces hébergements offrent déjà Ruby, et sont donc susceptibles d'offrir Node.js dans un futur proche.

<p>Malheureusement, beaucoup d'hébergements spécifiques à Node, tels que **Nodejitsu** et **Heroku** ne sont "PAS" compatibles avec Ghost. Ils fonctionneront dans un premier temps, mais supprimeront des fichiers et toutes les images envoyées et votre base de données vont disparaître. Heroku supporte MySQL et il vous est possible de l'utiliser, mais vous perdrez quand même les images envoyées.

Les liens suivants contiennent des instructions sur comment être opérationnel avec :

*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - from [howtoinstallghost.com](http://howtoinstallghost.com)
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - from [Corbett Barr](http://ghosted.co)
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - from [howtoinstallghost.com](http://howtoinstallghost.com)
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linux service) - from [Gilbert Pellegrom](http://ghost.pellegrom.me/)
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - from [Gregg Housh](http://0v.org/)
*   ...check the [installation forum](https://en.ghost.org/forum/installation) for more guides ...

## Faire tourner en permanence Ghost

La méthode décrite précédemment pour démarrer Ghost est `npm start`. C'est une bonne manière de faire du développement local et des tests, mais si vous démarrez Ghost à l'aide de cette ligne de commande, Ghost se fermera dès que vous fermerez la fenêtre du terminal ou que vous vous déconnecterez du SSH. Pour éviter que Ghost se ferme, vous devez lancer Ghost en tant que service. Il y a deux manières de faire.

### Forever ([https://npmjs.org/package/forever](https://npmjs.org/package/forever))

Vous pouvez utiliser `forever` pour lancer Ghost en tâche de fond. `forever` prendra également soin de votre Ghost et redémarrera le processus node si celui-ci crashe.

*   Pour installer `forever`, tapez `npm install forever -g`
*   Pour lancer Ghost en utilisant  `forever` depuis le répertoire d'installation, tapez `NODE_ENV=production forever start index.js`
*   Pour stopper Ghost, tapez `forever stop index.js`
*   Pour vérifier si Ghost est actuellement lancé, tapez `forever list`

### PM2 ([https://github.com/Unitech/pm2](https://github.com/Unitech/pm2))

PM2 est une solution plus aboutie que node-forever pour les applications NodeJS. En plus de proposer un redemarage automatique en cas de crash, elle permet aussi de [deployer votre code facilement](https://github.com/Unitech/pm2#deployment), de créer un init script en cas de redémarage de votre serveur et même de redemarrer Ghost à chaud.

*   Pour installer `pm2`, tapez `npm install pm2 -g`
*   Pour lancer Ghost tapez `NODE_ENV=production pm2 start index.js --name "Ghost"`
*   Pour stopper `pm2 stop Ghost`
*   Pour redémarrer Ghost `pm2 restart Ghost`
*   Pour recharger Ghost à chaud `pm2 reload Ghost`

*   Concernant le deploiement de votre application (local vers serveur) : [https://github.com/Unitech/pm2#deployment](https://github.com/Unitech/pm2#deployment)
*   Concernant la generation automatique de script init : [https://github.com/Unitech/pm2#startup-script](https://github.com/Unitech/pm2#startup-script)

### Supervisor ([http://supervisord.org/](http://supervisord.org/))

Les distributions Linux populaires &mdash; telles que Fedora, Debian et Ubuntu &mdash; maintiennent un paquet pour Supervisor : un système de contrôle de procesus qui vous permet de lancer Ghost au démarrage sans utiliser d'init scripts. Contrairement à un init script, Supervisor est portable entre les distributions Linux et leurs versions.

*   [Installez Supervisor](http://supervisord.org/installing.html) pour votre distribution Linux. En général, cela sera :
    *   Debian/Ubuntu: `apt-get install supervisor`
    *   Fedora: `yum install supervisor`
    *   La plupart des autres distributions: `easy_install supervisor`
*   Vérifiez que Supervisor est lancé, en lançant la commande `service supervisor start`
*   Créez le script de démarrage pour votre Ghost. Généralement, celui-ci se trouvera dans `/etc/supervisor/conf.d/ghost.conf` Par exemple:

    ```
    [program:ghost]
    command = node /chemin/vers/ghost/index.js
    directory = /chemin/vers/ghost
    user = ghost
    autostart = true
    autorestart = true
    stdout_logfile = /var/log/supervisor/ghost.log
    stderr_logfile = /var/log/supervisor/ghost_err.log
    environment = NODE_ENV="production"
    ```

*   Lancez Ghost en utilisant Supervisor : `supervisorctl start ghost`
*   Pour arrêter Ghost : `supervisorctl stop ghost`

Vous pouvez consulter la [documentation pour Supervisor](http://supervisord.org) pour de plus amples informations.

### Init Script

Les systèmes Linux utilisent des init scripts (scripts d'initialisation) pour effectuer certaines actions au démarrage du système. Ces scripts résident dans /etc/init.d. Pour faire tourner Ghost en permanence, ou même le relancer après un redémarrage système, vous pouvez mettre en place un init script. L'exemple suivant fonctionnera sur Ubuntu et a été testé sous **Ubuntu 12.04**.

*   Créez le fichier /etc/init.d/ghost avec le contenu suivant :

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

*   Changez les permissions d'éxécution du unit script en tapant
        `chmod 755 /etc/init.d/ghost`
*   Utilisation du script:

    *   démarrage : `service ghost start`
    *   arrêt : `service ghost stop`
    *   redémarrage : `service ghost restart`
    *   statut : `service ghost status`
*   Pour lancer Ghost au démarrage du système, le init script créé doit être enregistré pour le démarrage. Tapez les deux commandes suivantes dans une ligne de commande : `update-rc.d ghost defaults` et `update-rc.d ghost enable`

## Mettre en place Ghost avec un nom de domaine

La documentation sur comment utiliser nginx en tant que proxy inversé arrive bientôt !
