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

### Forever ([https://npmjs.org/package/forever](https://npmjs.org/package/forever)) <a id="forever"></a>

Du kannst `forever` nutzen, um Ghost als Hintergrunddienst zu betreiben. `forever` kümmert sich um deine Ghost-Installation und startet sie neu, falls der Node-Prozess durch einen Fehler beendet wird.

* Um `forever` zu installieren, verwende `npm install forever -g`
* Um Ghost zu starten, wechsle in das Ghost-Verzeichnis und führe `NODE_ENV=production forever start index.js` aus
* Um Ghost zu stoppen, führe `forever stop index.js` aus
* Um herauszufinden ob Ghost momentan läuft, führe `forever list` aus

### PM2 ([https://github.com/Unitech/pm2](https://github.com/Unitech/pm2))

PM2 ist eine fortgeschrittene Lösung als Node-forever für NodeJS Anwendungen. In Ergänzung zum automatischen Neustart im Crash-Fall, ist es möglich mit pm2 Ihr Code leichter als [je zuvor zu entwickeln](https://github.com/Unitech/pm2#deployment), ein Initskript bei Serverneustart zu erstellen, und selbst Ghost ohne Ausfallszeit neuzustarten.

*   Zur Installation pm2, `npm install pm2 –g` eingeben
*   Zur Ausführung Ghost auf Ihren Server: `NODE_ENV=production pm2 start index.js --name "Ghost"` eingeben
*   Zum Ghost-Stop: `pm2 stop Ghost`
*   Zum Neustart `pm2 restart Ghost`
*   Und zum Ghost Neustart ohne Ausfallszeit: `pm2 reload Ghost`

*   Bezüglich Ghostsvorgang (von Lokal auf Remote): [https://github.com/Unitech/pm2#deployment](https://github.com/Unitech/pm2#deployment)
*   Bezüglich Initskriptserstellung : [https://github.com/Unitech/pm2#startup-script](https://github.com/Unitech/pm2#startup-script)

### Supervisor ([http://supervisord.org/](http://supervisord.org/)) <a id="supervisor"></a>

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

### Init Script <a id="init-script"></a>

Linux-Systeme führen Init-Scripte beim Systemstart aus. Sie liegen in /etc/init.d. Um Ghost ununterbrochen auszuführen, sogar über einen Neustart hinweg, kannst du ein Init-Script einrichten. Das folgende Beispiel funktioniert unter Ubuntu und wurde unter **Ubuntu 12.04** getestet.

<span class="note">Abhängig vom Betriebssystem, müssen die folgenden Befehle eventuell mit `sudo` ausgeführt werden.</span>

*   Lege die Datei /etc/init.d/ghost mit folgendem Befehl an:

    ```
    $ curl https://raw.githubusercontent.com/TryGhost/Ghost-Config/master/init.d/ghost \
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

## Ghost mit einer Domain betreiben <a id="nginx-domain"></a>

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

## Ghost mit SSL zum Laufen bringen <a id="ssl"></a>

Nachdem du Ghost unter einer Domain eingerichtet hast, ist es eine gute Idee die Admin-Oberfläche oder vielleicht gleich deinen ganzen Blog durch HTTPS zu schützen. Es ist ratsam, die Admin-Oberfläche mit HTTPS zu schützen, da Benutzername und Passwort in Klartext übermittelt werden, wenn du keine Verschlüsselung einstellst.

Das folgende Beispiel wird dir zeigen, wie du SSL zum Laufen bekommst. Wir nehmen an, dass du bisher dieser Anleitung gefolgt bist und nginx als deinen Proxyserver benutzt. Ein Setup mit einem anderen Proxyserver sollte ähnlich aussehen.

Zuerst musst du ein SSL-Zertifikat von einem Provider erhalten, dem du vertraust. Dein Provider wird dich durch den Prozess von einer privaten Schlüsselgeneration und einer Zertifikatsregistrierungsanforderung (Certificate Signing Request, kurz CSR) leiten. Nachdem du deine Zertifizierungsdatei erhalten hast, musst du die CRT-Datei von deinem Zertifikatsprovider und die KEY-Datei, welche während der Erteilung des CSR generiert wird, zu deinem Server kopieren.

- `mkdir /etc/nginx/ssl`
- `cp server.crt /etc/nginx/ssl/server.crt`
- `cp server.key /etc/nginx/ssl/server.key`

Nachdem diese beiden Dateien an Ort und Stelle sind, musst du deine nginx-Konfiguration aktualisieren.

*   Öffne die nginx-Konfigurationsdatei mit einem Texteditor (z. B. `sudo nano /etc/nginx/sites-available/ghost.conf`)
*   Füge die mit einem Plus markierten Einstellungen zu deiner Konfigurationsdatei:

    ```
     server {
         listen 80;
    +    listen 443 ssl;
         server_name example.com;
    +    ssl_certificate        /etc/nginx/ssl/server.crt;
    +    ssl_certificate_key    /etc/nginx/ssl/server.key;
         ...
         location / {
    +       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    +       proxy_set_header Host $http_host;
    +       proxy_set_header X-Forwarded-Proto $scheme;
            proxy_pass http://127.0.0.1:2368;
            ...
         }
     }
    ```

    *   Starte nginx neu

    ```
    $ sudo service nginx restart
    ```

Nach diesen Schritten solltest du in der Lage sein, den Adminbereich deines Blogs über eine geschützte HTTPS-Verbindung zu erreichen. Wenn du all deinen Verkehr zur SSL-Benutzung zwingen möchtest, ist es möglich, das Protokoll der URL-Einstellungen in deiner config.js-Datei zu https zu ändern (z. B.: `url: 'https://mein-ghost-blog.com'`). Dies wird die SSL-Nutzung für Frontend und Adminbereich erzwingen. Alle Anfragen, die über HTTP gesendet werden, werden zu HTTPS weitergeleitet. Wenn du Bilder in deinen Posts einbaust, die von Domains stammen, die HTTP verwenden, erscheint eine 'insecure content' (unsicherer Inhalt)-Warnung. Scripte und Schriftarten von HTTP-Domains werden aufhören zu funktionieren.

In den meisten Fällen wirst du SSL im Adminbereich erzwingen wollen und das Frontend über HTTP und HTTPS bedienen. Um SSL für den Adminbereich zu erzwingen, wurde die Option `forceAdminSSL: true` eingeführt.

Wenn du weitere Informationen über das Aufsetzen von SSL für deinen Proxyserver benötigst, sind die offizielle SSL-Dokumentation von [nginx](http://nginx.org/en/docs/http/configuring_https_servers.html) und [apache](http://httpd.apache.org/docs/current/ssl/ssl_howto.html) perfekte Orte zum starten.
