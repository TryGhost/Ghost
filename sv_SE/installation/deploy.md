---
lang: sv-SE
layout: installation
meta_title: Hur du installerar Ghost på din server - Ghost Docs
meta_description: Allt du behöver veta för att komma igång med bloggplattformen Ghost på din lokal eller fjärrmiljö.         
heading: Installation av Ghost &amp; Komma igång
subheading: De första stegen för att sätta upp din blogg för första gången.
permalink: /sv_SE/installation/deploy/
chapter: installation
section: deploy
prev_section: linux
next_section: upgrading
---

## Komma igång med Ghost <a id="deploy"></a>

Så du har bestämt dig för att komma igång med Ghost? Utmärkt!

Det första beslutet du måste ta, är huruvida du vill installera Ghost manuellt, eller om du föredrar att använda ett installationsprogram.

### Installationsprogram

Det finns ett antal olika alternativ för simpla installationsprogram för tillfället:   
    
*   Lansera din blogg i molnet med [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost).
*   Starta Ghost med [Rackspace deployments](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html).
*   Kom igång med [DigitalOcean Droplet](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application).

### Manuell installation

Du kommer att behöva ett paket hos ett webbhotell som har eller tillåter dig att installera [Node.js](http://nodejs.org).
    Det betyder något som till exempel ett moln ([Amazon EC2](http://aws.amazon.com/ec2/), [DigitalOcean](http://www.digitalocean.com), [Rackspace Cloud](http://www.rackspace.com/cloud/)), VPS ([Webfaction](https://www.webfaction.com/), [Dreamhost](http://www.dreamhost.com/servers/vps/)) eller något annan tjänst som har SSH (terminal) access & tillåter dig att installera Node.js. Det finns många alternativ och de kan vara väldigt billiga.


Vad som inte funkar för tillfället, är cPanel-liknande tjänster med delade servrar eftersom de för det mesta är designade för att vara värd för PHP. Ett antal tillåter Ruby, och kan eventuellt erbjuda Nose.js i framtiden eftersom de är någorlunda lika.

Tråkigt nog så har många av de Node-specifika molnbaserade webbhotellen som **Nodejitsu** & **Heroku** ej stöd för Ghost. De kommer att fungera till en början, men kommer att ta bort dina filer och därigenom alla bilduppladdningar och din databas. Heroku stödjer MySQL som skulle möjliggöra användning, men du kommer fortfarande att förlora alla uppladdade bilder.

Följande länkar innehåller instruktioner för att komma igång med:

*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - from [howtoinstallghost.com](http://howtoinstallghost.com)
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - from [Corbett Barr](http://ghosted.co)
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - from [howtoinstallghost.com](http://howtoinstallghost.com)
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linux service) - from [Gilbert Pellegrom](http://ghost.pellegrom.me/)
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - from [Gregg Housh](http://0v.org/)
*   ...check the [installation forum](https://en.ghost.org/forum/installation) for more guides ...

## Sätta igång Ghost med forever

Den tidigare beskrivna metoden för att starta Ghost är `npm start`. Detta är ett bra sätt att göra lokal utveckling och testning, men om du startar Ghost med kommandotolken kommer processen stängas av när du stänger fönstret för kommandotolken eller loggar ut från SSH. För att förhindra Ghost från att stängas av måste du köra Ghost som en tjänst. Det finns två sätt att åstadkomma detta.

### Forever ([https://npmjs.org/package/forever](https://npmjs.org/package/forever))

Du kan använda `forever`för att köra Ghost som en bakgrundsprocess. `forever` kommer även ta hand om din installation av Ghost och kommer att starta om processen i node om den kraschar.

*   För att installera `forever` skriv `npm install forever -g`
*   För att starta Ghost med `forever` från installationsmappen för Ghost skriv `NODE_ENV=production forever start index.js`
*   För att stoppa Ghost skriv `forever stop index.js`
*   För att testa om processen för Ghost är igång, skriv `forever list`

### Supervisor ([http://supervisord.org/](http://supervisord.org/))

Populära Linuxdistributioner&mdash;som Fedora, Debian, and Ubuntu&mdash;upprätthåller ett paket för Supervisor: Ett processkontrolleringssytem som tillåter dig att köra Ghost vid uppstart utan att använda initieringsskript. Till skillnad från ett initieringsskript är Supervisor flyttbar mellan Linuxdistributioner och versioner.

*   [Installera Supervisor](http://supervisord.org/installing.html) som krävs för din Linuxdistribution. Normalt är detta:
    *   Debian/Ubuntu: `apt-get install supervisor`
    *   Fedora: `yum install supervisor`
    *   De flesta andra distributioner: `easy_install supervisor`
*   Bekräfta att Supervisor är igång, genom att skriva `service supervisor start`
*   Create the startup script for your Ghost installation. Typically this will go in `/etc/supervisor/conf.d/ghost.conf` For example:
*   Gör ett uppstartsskript för din Ghostinstallation. Normalt är denna lokaliserad i `/etc/supervisor/conf.d/ghost.conf` till exempel.

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

*   Starta Ghost med Supervisor: `supervisorctl start ghost`
*   Stäng av Ghost: `supervisorctl stop ghost`

Du kan läsa [dokumentationen för Supervisor](http://supervisord.org) för mer information.

### Initieringsskript

Linuxsystem använder initieringsskript som körs vid uppstart av systemet. Dessa skript finns i `/etc/init.d`. För att få Ghost att köras för alltid och även överleva en omstart bör du ställa in ett initieringsskript som åstadkommer detta. Följande exempel fungerar på Ubuntu och är testat på **Ubuntu 12.04**.

*   Skapa filen `/etc/init.d/ghost` with the following command:

    ```
    $ sudo curl https://raw.github.com/TryGhost/Ghost-Config/master/init.d/ghost \
      -o /etc/init.d/ghost
    ```

*   Öpnna filen med `nano /etc/init.d/ghost` och stäm av följande:
*   Att `GHOST_ROOT` variabeln är ändrad till den plats där du har installerat Ghost
*   Att `DAEMON` variabeln är detsamma som utmatningen av `which node`
*   Att initieringsskriptet är igång med sin egen Ghost-användare och grupp på ditt system, skapa dem med följande:

    ```
    $ sudo useradd -r ghost -U
    ```

*   Låt oss även säkra att användaren för Ghost har access till installationen:

    ```
    $ sudo chown -R ghost:ghost /path/to/ghost
    ```

*   Ändra exekveringstillåtelserna för initieringsskriptet genom att skriva

    ```
    $ sudo chmod 755 /etc/init.d/ghost
    ```

*   Nu kan du kontrollera Ghost med följande kommandon:

    ```
    $ sudo service ghost start
    $ sudo service ghost stop
    $ sudo service ghost restart
    $ sudo service ghost status
    ```

*   För att starta Ghost vid uppstart måste det nyligen skapade initieringsskriptet vara registrerat för uppstart.
    Skriv följande två kommandon i kommandotolken:

    ```
    $ sudo update-rc.d ghost defaults
    $ sudo update-rc.d ghost enable
    ```

*   Bekräfta att din användare kan ändra filer, config.js i Ghost-mappen till exempel, genom att tilldela dig till gruppen ghost.
    ```
    $ sudo adduser USERNAME ghost
    ```

*   Om du nu startar om din server borde Ghost redan vara igång för dig.


## Ställ in Ghost med ett domännamn

Om du har ställt in Ghost för att köra för evigt kan du även ställa in en webbserver som en proxy för att expediera din blogg med din domän.
I detta exemplet förutsätter vi att du använder **Ubuntu 12.04** och använder **nginx** som webbserver.
Vi förutsätter även att Ghost körs i bakgrunden med en av de två ovannämnda sätten.

*   Installera nginx

    ```
    $ sudo apt-get install nginx
    ```
    <span class="note">This will install nginx and setup all necessary directories and basic configurations.</span>

*   Konfigurera din webbserver

    *   Skapa en ny fil i `/etc/nginx/sites-available/ghost.conf`
    *   Öppna filen med en textredigerare (t.ex. `sudo nano /etc/nginx/sites-available/ghost.conf`)
        och skriv in följande

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

    *   Ändra `server_name` till din domän
    *   Symlänka din konfiguration i `sites-enabled`:

    ```
    $ sudo ln -s /etc/nginx/sites-available/ghost.conf /etc/nginx/sites-enabled/ghost.conf
    ```

    *   Starta om nginx

    ```
    $ sudo service nginx restart
    ```
