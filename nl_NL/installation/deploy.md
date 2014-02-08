---
layout: installation
meta_title: Hoe installeer je Ghost op je eigen server - Ghost Docs
meta_description: Alle informatie om het Ghost blogging platform op je eigen lokale en online server te installeren en te draaien.
heading: Installeer Ghost & beginnen
subheading: De eerste stappen om je nieuwe blog te installeren.
permalink: /nl_NL/installation/deploy/
chapter: installation
section: deploy
prev_section: linux
next_section: upgrading
---
## Start met Ghost <a id="deploy"></a>

Je bent er klaar voor om Ghost te gebruiken? Geweldig!

De eerste keuze die je maakt, is of je Ghost zelf wilt installeren en configureren, of je liever een installatieprogramma gebruikt.

### Installatieprogramma

Er zijn een paar installatieprogramma's op dit moment beschikbaar.

* Gebruik de clouddienst van [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost).
* Installeer Ghost via een [Rackspace installatie](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html).
* Begin met Ghost via de [DigitalOcean Droplet](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application).

### Handmatige installatie

Je hebt een hostingpakket nodig dat de beschikking heeft over [Node.js](http://nodejs.org) of je de mogelijkheid geeft dit te installeren.
Dit betekent dat je gebruik kunt maken van een clouddienst ([Amazon EC2](http://aws.amazon.com/ec2/), [DigitalOcean](http://www.digitalocean.com), [Rackspace Cloud](http://www.rackspace.com/cloud/)), VPS ([Webfaction](https://www.webfaction.com/), [Dreamhost](http://www.dreamhost.com/servers/vps/)) of elk pakket met SSH toegang (terminal)  en de mogelijkheid om Node.js te installeren. Er zijn veel mogelijkheden en de startprijzen kunnen laag zijn.

Wat nu nog *niet* werkt zijn hostingproviders met cPanel-achtige omgevingen. Deze zijn veelal gericht op PHP omgevingen. Sommigen kunnen Ruby aanbieden en zouden in de toekomst dan Node.js kunnen aanbieden.

Helaas zijn een aantal Node-specifieke cloud diensten zoals **Nodejitsu** en **Heroku** niet compatibel met Ghost. Ze lijken in het begin te werken, maar de kans bestaat dat je bestanden worden verwijderd en je database verdwijnt. Heroku ondersteunt MySQL, maar je loopt nog altijd het risico dat bestanden onbedoeld worden verwijderd.

Onderstaande lijst bevat instructies hoe je kunt starten met Ghost bij diverse cloud diensten. 

*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - via  [howtoinstallghost.com](http://howtoinstallghost.com)
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - via [Corbett Barr](http://ghosted.co)
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - via  [howtoinstallghost.com](http://howtoinstallghost.com)
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linux service) - via [Gilbert Pellegrom](http://ghost.pellegrom.me/)
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - via [Gregg Housh](http://0v.org/)
*   ...bekijk het [installatie forum](https://en.ghost.org/forum/installation) voor meer gidsen ...

## Laat Ghost continu draaien

De methode die we beschreven om Ghost te starten is `npm start`. Dit is een prima manier om lokaal te ontwikkelen en te testen, maar met de methode via de commandline stopt Ghost als je je terminal scherm sluit of uitlogt uit SSH. Om te voorkomen dat Ghost stopt dien je het als een service te draaien. Er zijn twee manieren om dit te doen

### Forever ([https://npmjs.org/package/forever](https://npmjs.org/package/forever)) <a id="forever"></a>

Je kunt  `forever` gebruiken om Ghost als achtergrond taak te draaien. `forever` zorgt voor de Ghost installatie en herstart het proces na een crash. 

* 	Installeer `forever` middels `npm install forever -g`
*  Om Ghost middels `forever` te starten uit de Ghost directory type `NODE_ENV=production forever start index.js`
*   Om Ghost te stoppen type je `forever stop index.js`
*   Om te kijken of Ghost nog draait type je `forever list`

### Supervisor ([http://supervisord.org/](http://supervisord.org/)) <a id="supervisor"></a>

Populaire Linux distributies &mdash; zoals Fedora, Debian, and Ubuntu&mdash;maken gebruik van een pakket voor Supervisor: Een process controle systeem wat je de mogelijkheid biedt om Ghost te draaien vanaf de startup zonder gebruik te maken van init scripts. In tegenstelling tot init scripts is Supervisor uitwisselbaar tussen Linux distributies en versies.

*   [Installeer Supervisor](http://supervisord.org/installing.html) voor jouw Linux distributie. Dit is doorgaans:
    *   Debian/Ubuntu: `apt-get install supervisor`
    *   Fedora: `yum install supervisor`
    *   De meeste andere distributies: `easy_install supervisor`
*   Verifieer dat Supervisor draait via `service supervisor start`
*   Maak het startscript voor je Ghost installatie. Dit plaats je doorgaans in `/etc/supervisor/conf.d/ghost.conf` Bijvoorbeeld:

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

*   Start Ghost via Supervisor: `supervisorctl start ghost`
*   Stop Ghost via: `supervisorctl stop ghost`

Bekijk de [documentatie van Supervisor](http://supervisord.org) voor meer informatie.

### Init Script <a id="init-script"></a>

Linux systemen gebruiken init scripts bij het opstarten van het systeem. Deze scripts staan in /etc/init.d. 
Om Ghost altijd te laten draaien, zelfs na een reboot, kun je een init script maken. Het volgende voorbeeld werkt voor Ubuntu en is getest op **Ubuntu 12.04**.

*   Maak het bestand /etc/init.d/ghost met het volgende commando:

    ```
    $ sudo curl https://raw.github.com/TryGhost/Ghost-Config/master/init.d/ghost \
      -o /etc/init.d/ghost
    ```

*   Open het bestand `nano /etc/init.d/ghost` en maak de volgende aanpassingen:
*   Verander de variabele `GHOST_ROOT` naar je eigen pad waar je Ghost hebt geinstalleerd.
*   Check of de `DAEMON` variabele gelijk is aan de output van `which node`
*   Het init script draait met zijn eigen Ghost gebruiker en groep op je systeem. Deze maak je als volgt:

    ```
    $ sudo useradd -r ghost -U
    ```

*   Geef de Ghost gebruiker direct toegang tot de installatie:

    ```
    $ sudo chown -R ghost:ghost /path/to/ghost
    ```

*   Verander de lees- en schrijfrechten van het init script

    ```
    $ sudo chmod 755 /etc/init.d/ghost
    ```

*   Nu kun je Ghost gebruiken met de volgende commando's:

    ```
    $ sudo service ghost start
    $ sudo service ghost stop
    $ sudo service ghost restart
    $ sudo service ghost status
    ```

*   Registreer het nieuwe script om Ghost met een systeem startup mee te starten. 

	Type de volgende twee commando's op de command line:

    ```
    $ sudo update-rc.d ghost defaults
    $ sudo update-rc.d ghost enable
    ```

*   Verzeker jezelf dat de gebruiker bestanden kan veranderen zoals config.js in de Ghost directory. Voeg jezelf toe aan de ghost groep:

    ```
    $ sudo adduser USERNAME ghost
    ```

*   Herstart de server en Ghost draait dan al voor je.


## Ghost aan een domeinnaam koppelen <a id="nginx-domain"></a>

Als je Ghost hebt geinstalleerd om altijd te blijven draaien, kun je eveneens een web server instellen om je blog met een eigen domein te draaien.
In onderstaand voorbeeld gaan we er van uit dat je **Ubuntu 12.04** draait en  **nginx** als web server gebruikt
Tevens nemen we aan dat Ghost al op de achtergrond draait op een van de bovenstaande wijzen.

*   Installeer nginx

    ```
    $ sudo apt-get install nginx
    ```
    <span class="note">Dit installeert nginx en configureert alle noodzakelijke directories en basis instellingen</span>

*   Configureer je site

    *   Maak een nieuw bestand `/etc/nginx/sites-available/ghost.conf`
    *   Open het bestand met een tekst editor (bv `sudo nano /etc/nginx/sites-available/ghost.conf`)
        en voeg onderstaande toe

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

    *   Verander `server_name` in je eigen domeinnaam
    *   Symlink je configuratie in `sites-enabled`:

    ```
    $ sudo ln -s /etc/nginx/sites-available/ghost.conf /etc/nginx/sites-enabled/ghost.conf
    ```

    *   Herstart nginx

    ```
    $ sudo service nginx restart
    ```

## Configureer Ghost met SSL <a id="ssl"></a>

Na het installeren en instellen van je eigen domein is het een goed idee om het beheer van je blog of je complete blog te beveiligen met HTTPS. Wij adviseren om in elk geval het beheer te beveiligen omdat je loginnaam en wachtwoord als plaintext wordt verstuurd als je geen encryptie instelt.

Onderstaand voorbeeld laat zien hoe je SSL kunt instellen. We nemen aan dat je de documentatie hebt gevolgd en nginx gebruikt als proxy server. De setup met een andere proxy server is echter vergelijkbaar.

Eerst dien je een SSL certificaat van een vertrouwde leverancier aan te schaffen. De leverancier zal je door het proces helpen om een private key te maken en het *certificate signing request* (CSR). Na ontvangst van het certificaat bestand copieer je deze samen met het gegenereerde KEY bestand naar de server.

- `mkdir /etc/nginx/ssl`
- `cp server.crt /etc/nginx/ssl/server.crt`
- `cp server.key /etc/nginx/ssl/server.key`

Als deze twee bestanden aanwezig zijn update je de nginx configuratie.

*   Open het  file with a text editor (e.g. `sudo nano /etc/nginx/sites-available/ghost.conf`)
*   Voeg onderstaande instellingen toe die door het plusteken worden voorafgegaan:

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

    *   Herstart nginx

    ```
    $ sudo service nginx restart
    ```

Na deze stappen is het mogelijk om het beheer van je blog te bereiken via een HTTPS verbinding. Wil je al het verkeer van je blog via SSL leiden, pas dan het protocol van de URL instellingen aan in config.js naar https (bv: `url: 'https://my-ghost-blog.com'`). Dit bepaalt het gebruik van SSL bij zowel je blog als het beheer. Alle HTTP aanvragen worden omgeleid naar HTTPS. Als je afbeeldingen in je artikel plaatst die je ophaalt met een HTTP verbinding, krijg je de melding dat er 'onveilige inhoud' aanwezig is, Scripts en fonts vanaf HTTP domeinen zullen niet meer werken. 

In de meeste gevallen wil je SSL gebruiken in de administratie en je blog gewoon via HTTP en HTTPS serveren. Om SSL te gebruiken in de administratie, gebruik je de optie  `forceAdminSSL: true` .

Als je meer informatie wilt over het opzetten van SSL voor je eigen proxy server, dan zijn de officiële documentatie van [nginx](http://nginx.org/en/docs/http/configuring_https_servers.html) en [apache](http://httpd.apache.org/docs/current/ssl/ssl_howto.html) een prima plaats om te starten.
