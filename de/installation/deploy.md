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

Im Moment gibt es eine Reihe an einfachen Installationsprogrammen.

* Ghost in der Cloud bei [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost).
* Ghost mittels [Rackspace deployments](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html) betreiben.
* Ein [DigitalOcean Droplet](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application) verwenden.

### Manuelle Einrichtung

Dies erfordert einen Hosting-Account der bereits [Node.js](http://nodejs.org) beherrscht oder es zur Installation anbietet. Viele Cloud-Dienste ([Amazon EC2](http://aws.amazon.com/ec2/), [DigitalOcean](http://www.digitalocean.com), [Rackspace Cloud](http://www.rackspace.com/cloud/)), VPS ([Webfaction](https://www.webfaction.com/), [Dreamhost](http://www.dreamhost.com/servers/vps/)) oder andere Pakete mit SSH-Zugang ermöglichen die installation von Node.js. Es gibt viele Anbieter und einige sind sehr günstig.

Was momentan nicht unterstützt wird, ist Shared-Hosting im Stil von cPanel, welches normalerweise ausschließlich PHP bietet. Wer jedoch bereits heute Ruby unterstützt, wird möglicherweise in Zukunft auch Node.js unterstützen, da diese gewissermaßen ähnlich sind.

Leider sind viele der Node.js Cloud-Hosting-Dienste wie **Nodejitsu** und **Heroku**  **NICHT** kompatibel mit Ghost. Zwar lässt sich Ghost auf ihnen starten, sie löschen allerdings deine Dateien und somit auch alle hochgeladenen Bilder und die Datenbank. Heroku unterstützt MySQL und lässt sich somit verwenden, Bilder bleiben dennoch nicht permanent erhalten.

Die folgenden Links enthalten englische Anleitungen, die die Einrichtung beschreiben:

*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - from [howtoinstallghost.com](http://howtoinstallghost.com)
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - from [Corbett Barr](http://ghosted.co)
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - from [howtoinstallghost.com](http://howtoinstallghost.com)
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linux service) - from [Gilbert Pellegrom](http://ghost.pellegrom.me/)
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - from [Gregg Housh](http://0v.org/)
*   ...check the [installation forum](https://en.ghost.org/forum/installation) for more guides ...

## Ghost ununterbrochen ausführen


Bisher wurde Ghost mit `npm start` gestartet. Das ist der beste Weg für lokale Entwicklung oder Tests, sobald du allerdings das Terminal beendest oder dich aus SSH ausloggst, wird Ghost auch beendet. Um das zu verhindern, musst du Ghost als Dienst ausführen, wofür es mehrere Wege gibt.

### Forever ([https://npmjs.org/package/forever](https://npmjs.org/package/forever))

Du kannst `forever` nutzen, um Ghost als Hintergrunddienst zu betreiben. `forever` kümmert sich um deine Ghost-Installation und startet sie neu, falls der Node-Prozess durch einen Fehler beendet wird.

* Um `forever` zu installieren, verwende `npm install forever -g`
* Um Ghost zu starten, wechsle in das Ghost-Verzeichnis und führe `NODE_ENV=production forever start index.js` aus
* Um Ghost zu stoppen, führe `forever stop index.js` aus
* Um herauszufinden ob Ghost momentan läuft, führe `forever list` aus

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
    command = node /Pfad/zu/Ghost/index.js
    directory = /Pfad/zu/Ghost
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

<span class="note">Abhängig vom Betriebssystem, müssen die folgenden Befehle eventuell mit `sudo` ausgeführt werden.</span>

*   Lege die Datei /etc/init.d/ghost mit folgendem Befehl an:

    ```
    $ curl https://raw.github.com/TryGhost/Ghost-Config/master/init.d/ghost \
      -o /etc/init.d/ghost
    ```

*   Öffne die Datei mit `nano /etc/init.d/ghost` und prüfe folgendes:
*   Ändere die `GHOST_ROOT` Variable zum Pfad unter dem Ghost installiert ist
*   Prüfe ob die `DEAMON` variable der Ausgabe von `which node` entspricht
*   Setze die korrekten Rechte mit dem Befehl

    ```
    $ chmod 755 /etc/init.d/ghost
    ```

*   Verwendung des Scripts:

    *   Start: `service ghost start`
    *   Stopp: `service ghost stop`
    *   Neustart: `service ghost restart`
    *   Status: `service ghost status`

*   Um Ghost beim Systemstart automatisch zu starten, muss das Init-Script entsprechend registriert werden. 
    Das geht mit den folgenden Befehlen:

    ```
    $ update-rc.d ghost defaults
    $ update-rc.d ghost enable
    ```

Weitere Dokumentation darüber, wie node mit forever verwendet wird und wie man Ghost als daemon unter Ubuntu betreibt, werden sehr bald hinzugefügt!

## Ghost mit einer Domain betreiben

Wenn du Ghost aufgesetzt hast um immer zu laufen, kannst du auch einen Web-Server als Proxy einrichten mit deiner Domain.
Im folgenden Beispiel nehmen wir an du verwendest **Ubuntu 12.04** und benutzt **nginx** als Web-Server.
Es nimmt auch an, dass Ghost im Hintergrund lauft mit einer der oben genannten Methoden.

*   Installiere nginx

    ```
    $ sudo apt-get install nginx
    ```
    <span class="note">Dies installiert nginx und richtet alle nötigen Verzeichnisse und eine Standardkonfiguration an</span>

*   Konfiguriere deine Seite

    *   Erstelle eine Datei unter `/etc/nginx/sites-available/example.com`
    *   Öffne die Datei mit einem Text-Editor (z.B. `sudo nano /etc/nginx/sites-available/example.com`)
        und füge folgendes ein:

        ```
        server {
            listen 80;

            server_name example.com;
            root /var/www/ghost;

            location / {
                proxy_set_header   X-Real-IP $remote_addr;
                proxy_set_header   Host      $http_host;
                proxy_pass         http://127.0.0.1:2368;
            }
        }

        ```
    *   Ändere `server_name` und `root` deinem Setup entsprechend
    *   Symlinke deine Konfiguration `sites-enabled`

    ```
    $ sudo ln -s /etc/nginx/sites-available/ghost.conf /etc/nginx/sites-enabled/ghost.conf
    ```
    *   Starte nginx neu

    ```
    $ sudo service nginx restart
    ```

