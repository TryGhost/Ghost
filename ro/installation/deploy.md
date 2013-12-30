---
layout: installation
meta_title: Cum să instalezi Ghost pe propriul server - Ghost Docs
meta_description: Toate informațiile necesare pentru a instala și rula Ghost local sau pe serverul personal
heading: Instalează Ghost &amp; Introducere
subheading: Primii pași pentru a configura noul tău blog
permalink: /ro/installation/deploy/
chapter: installation
section: deploy
prev_section: linux
next_section: upgrading
---

## Rularea Ghost <a id="deploy"></a>

Ești gata să rulezi Ghost? Excelent!

Prima decizie pe care trebuie să o iei e dacă vrei să instalezi și configurezi Ghost singur sau dacă vrei să folosești un pachet precompilat.

### Installers

Poți lansa Ghost automat prin următoarele servicii:

* [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost).
* [Rackspace deployments](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html).
* [DigitalOcean Droplet](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application).

### Setup Manual

Îți va trebui un serviciu de hosting care are deja instalat sau permite instalarea [Node.js](http://nodejs.org).
    Asta înseamnă un serviciu ca [Amazon EC2](http://aws.amazon.com/ec2/), [DigitalOcean](http://www.digitalocean.com), [Rackspace Cloud](http://www.rackspace.com/cloud/)), VPS ([Webfaction](https://www.webfaction.com/), [Dreamhost](http://www.dreamhost.com/servers/vps/) sau altele care permit accesul prin SSH și instalarea Node.js. 

Momentan nu este funcțională instalarea în stil cPanel pentru că este de obicei construită pentru hosturile PHP.

<p>Din păcate multe platforme care suportă Node, cum ar fi **Nodejitsu** & **Heroku** **NU** sunt compatibile cu Ghost. Vor merge la început, dar periodic îți vor șterge fișierele și imaginile, și în cazul **Nodejitsu**, îți vei pierde inclusiv baza de date.

Următoarele linkuri conțin instrucțiuni pentru diferinte servicii de hosting(ghidurile sunt publicate în engleză):

*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - de la [howtoinstallghost.com](http://howtoinstallghost.com)
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - de la [Corbett Barr](http://ghosted.co)
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - de la [howtoinstallghost.com](http://howtoinstallghost.com)
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linux service) - de la [Gilbert Pellegrom](http://ghost.pellegrom.me/)
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - from [Gregg Housh](http://0v.org/)
*   ...check the [installation forum](https://en.ghost.org/forum/installation) for more guides ...

## Fă Ghost să meargă continuu

Metoda descrisă anterior folosește comanda `npm start`. E o metodă bună pentru dezvoltarea locală și teste, dar dacă închizi terminalul sau ieși din SSH, Ghost se va opri. Pentru a evita asta, vom descrie două metode.

### Forever ([https://npmjs.org/package/forever](https://npmjs.org/package/forever))

Poți folosi `forever` să rulezi Ghost în background. `forever` va instala Ghost și în caz de erori îl va restarta automat.

*   Pentru a instala `forever`, scrie `npm install forever -g`
*   Scrie `NODE_ENV=production forever start index.js`
*   Pentru a opri Ghost, `forever stop index.js`
*   Pentru a verifica dacă Ghost rulează, scrie `forever list`

### Supervisor ([http://supervisord.org/](http://supervisord.org/))

Distribuții populare de Linux&mdash;cum ar fi Fedora, Debian și Ubuntu&mdash;au pachete pentru Supervisor disponibile. Spre deosebire de un script init, Supervisor e portabil între distribuții diferite de Linux.

*   [Instalează Supervisor](http://supervisord.org/installing.html) în funcție de distroul folosit. De obice va fi:
    *   Debian/Ubuntu: `apt-get install supervisor`
    *   Fedora: `yum install supervisor`
    *   Majoritatea celorlalte distrouri: `easy_install supervisor`
*   Asigurați-vă că Supervisor rulează prin `service supervisor start`
*   Creează scriptul de start-up pentru Ghost. Locația configurației va fi de obicei aici: `/etc/supervisor/conf.d/ghost.conf`. De exemplu:

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

*   Pornește Ghost prin Supervisor: `supervisorctl start ghost`
*   Pentru a-l opri: `supervisorctl stop ghost`

Poți consulta [documentația pentru Supervisor](http://supervisord.org)(en) pentru mai multe informații.

### Script Init

Sistemele Linux folosesc scripturi init care rulează la boot. Aceste scripturi există în /etc/init.d. Pentru a face Ghost să ruleze indefinit și a supraviețuii o restartare, poți folosi un astfel de script. Următorul exemplu este funcțional și a fost testat pe **Ubuntu 12.04**.

*   Creează fișierul /etc/init.d/ghost cu următoarea comandă:

    ```
    $ sudo curl https://raw.github.com/TryGhost/Ghost-Config/master/init.d/ghost \
      -o /etc/init.d/ghost
    ```

*   Deschide fișierul cu `nano /etc/init.d/ghost` și verifică următoarele:
*   Schimbă variabila `GHOST_ROOT` cu pathul spre Ghost
*   Verifică dacă variabila `DAEMON` e la fel cu outputul comenzii `which node`
*   Scriptul init folosește proprii utilizatori și grup așa că trebuie creați manual:

    ```
    $ sudo useradd -r ghost -U
    ```

*   Asigurați-vă că userul ghost are access la folderul unde e instalat Ghost:

    ```
    $ sudo chown -R ghost:ghost /path/to/ghost
    ```

*   Schimbă permisiile de execuție ale scriptului:

    ```
    $ sudo chmod 755 /etc/init.d/ghost
    ```

*   Acum poți controla Ghost cu următoarele comenzi:

    ```
    $ sudo service ghost start
    $ sudo service ghost stop
    $ sudo service ghost restart
    $ sudo service ghost status
    ```

*   Pentru ca Ghost să pornească la start-up, scriptul trebuie înregistrat.
    Scrie următoarele două comenzi în terminal: 

    ```
    $ sudo update-rc.d ghost defaults
    $ sudo update-rc.d ghost enable
    ```

*   Asigurați-vă că userii au permisiuni de editare asupra fișierelor, de exemplu config.js, prin adăugarea lor în grupul ghost:
    ```
    $ sudo adduser USERNAME ghost
    ```

*   Dacă restartezi serverul, Ghost va porni automat.


## Setează Ghost cu un domeniu personal

Dacă ai setat Ghost să ruleze indefinit, îl poți seta ca server pentru orice domeniu.
În acest exemplu presupunem că folosești **Ubuntu 12.04** și folosești **nginx** ca server.
Deasemenea presupunem că Ghost rulează în background folosind una din metodele de mai sus.

*   Instalează nginx

    ```
    $ sudo apt-get install nginx
    ```
    <span class="note">Comanda va instala nginx și va creea folderele și configurațiile de bază. *Comanda va diferi în funcție de distroul și managerul de pachete folosit.*</span>

*   Configurează site-ul

    *   Creează un nou fișier aici: `/etc/nginx/sites-available/ghost.conf`
    *   Deschide fișierul cu un editor de text (e.g. `sudo nano /etc/nginx/sites-available/ghost.conf`)
        și copiați următoarele:

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

    *   Schimbă `server_name` pentru a corespunde cu domeniul tău
    *   Fă un symlink configurației în `sites-enabled`:

    ```
    $ sudo ln -s /etc/nginx/sites-available/ghost.conf /etc/nginx/sites-enabled/ghost.conf
    ```

    *   Repornește nginx

    ```
    $ sudo service nginx restart
    ```
