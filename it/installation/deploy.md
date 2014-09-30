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

La prima decisione da prendere è se vuoi installare Ghost manualmente o se preferisci usare un installer.

### Installers

Al momento le alternative con installer semplici da usare sono principalmente:

*   Rilasciare sul cloud di [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost).
*   Avviare Ghost tramite [Rackspace deployments](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html).
*   Configurare un [droplet su DigitalOcean](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application).

### Installazione Manuale

Hai bisogno di un servizio di hosting che abbia o ti permetta di installare [Node.js](http://nodejs.org).
    Ciò significa qualcosa come un cloud ([Amazon EC2](http://aws.amazon.com/ec2/), [DigitalOcean](http://www.digitalocean.com), [Rackspace Cloud](http://www.rackspace.com/cloud/)), VPS ([Webfaction](https://www.webfaction.com/), [Dreamhost](http://www.dreamhost.com/servers/vps/)) o altri pacchetti con accesso SSH (terminale) e che ti permettano di installare Node.js. Ne esistono diversi, alcuni molto economici.

Attualmente non sono utilizzabili hosting condivisi stile cPanel, in quanto solitamente concepiti per hosting PHP. Alcuni di essi offrono Ruby, dunque in futuro potrebbero darti la possibilità di usare anche Node.js, essendo simili.

<p>Sfortunatamente molte delle soluzioni di cloud non concepite specificatamente per Node.js, come **Nodejitsu** o **Heroku**, **NON** sono compatibili con Ghost. Funzionano inizialmente, ma cancellano i tuoi file, dunque tutte le immagini caricate e il database scompaiono. Heroku supporta MySQL quindi potresti adoperarlo, ma perderesti ugualmente le immagini caricate.

I seguenti links contengono istruzioni su come configurare:

*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - da [howtoinstallghost.com](http://howtoinstallghost.com)
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - da [Corbett Barr](http://ghosted.co)
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - da [howtoinstallghost.com](http://howtoinstallghost.com)
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linux service) - da [Gilbert Pellegrom](http://ghost.pellegrom.me/)
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - da [Gregg Housh](http://0v.org/)
*   ...visita la [sezione installazioni del forum](https://en.ghost.org/forum/installation) per altre guide...

## Rendere Ghost permanente

Il metodo precedentemente descritto per avviare Ghost è `npm start`. È valido per sviluppare localmente e per testare, tuttavia avviare Ghost da riga di comando implica interromperne l'erogazione una volta chiuso il terminale o la sessione SSH. Per evitare che Ghost si interrompa occorre eseguirlo come servizio. Ci sono due modi per ottenere questo risultato.

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

I sistemi Linux usano script di init per avviare al boot del sistema. Questi scripts sono presenti in /etc/init.d. Per rendere Ghost permanente anche in caso di riavvio puoi utilizzare uno script di init. L'esempio seguente funziona con Ubuntu ed è stato testato con **Ubuntu 12.04**.


*   Crea il file /etc/init.d/ghost:

    ```
    $ sudo curl https://raw.githubusercontent.com/TryGhost/Ghost-Config/master/init.d/ghost \
      -o /etc/init.d/ghost
    ```

*   Apri il file con `nano /etc/init.d/ghost`
*   Cambia la variabile `GHOST_ROOT` con il percorso alla tua installazione di Ghost
*   Assicurati che il valore della variabile `DAEMON` sia uguale all'output del comando `which node`
*   Lo script di init viene eseguito con utente e gruppo `ghost`, che vanno creati sul tuo sistema:

    ```
    $ sudo useradd -r ghost -U
    ```

*   Assicuriamoci che l'utente ghost abbia il permesso di scrivere nella cartella di installazione:

    ```
    $ sudo chown -R ghost:ghost /percorso/cartella/ghost
    ```

*   Cambia i permessi di esecuzione dello script di init

    ```
    $ sudo chmod 755 /etc/init.d/ghost
    ```

*   Ora Ghost può essere gestito con questi comandi:

    ```
    $ sudo service ghost start
    $ sudo service ghost stop
    $ sudo service ghost restart
    $ sudo service ghost status
    ```

*   Per lanciare Ghost al boot del sistema, lo script di init deve essere eseguito all'avvio.

    ```
    $ sudo update-rc.d ghost defaults
    $ sudo update-rc.d ghost enable
    ```

*   Assicurati che il tuo utente possa modificare i file, ad esempio config.js (nella cartella di installazione di Ghost), aggiungendoti al gruppo utenti di ghost:
    ```
    $ sudo adduser USERNAME ghost
    ```

*   Se riavvii il server, Ghost dovrebbe partire automaticamente.


## Usare un nome di dominio con Ghost

Se hai configurato Ghost in modo che sia sempre in esecuzione, puoi anche installare un web server che faccia da proxy servendo il blog dal tuo dominio.
In questo esempio useremo **Ubuntu 12.04** e **nginx** come web server.
Diamo per scontato che Ghost sia già in esecuzione come servizio in background (se hai seguito uno dei metodi suggeriti sopra, sei a posto).

*   Installa nginx

    ```
    $ sudo apt-get install nginx
    ```
    <span class="note">Questo comando installerà nginx e creerà le cartelle necessarie oltre che la configurazione base.</span>

*   Configura il sito

    *   Crea il file `/etc/nginx/sites-available/ghost.conf`
    *   Apri il file con un editor di testo (es. `sudo nano /etc/nginx/sites-available/ghost.conf`)
        e incolla la seguente configurazione:

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

    *   Cambia `server_name` con il tuo dominio
    *   Crea un symlink del file di configurazione in `sites-enabled`:

    ```
    $ sudo ln -s /etc/nginx/sites-available/ghost.conf /etc/nginx/sites-enabled/ghost.conf
    ```

    *   Riavvia nginx

    ```
    $ sudo service nginx restart
    ```

## Configurare Ghost con SSL <a id="ssl"></a>

Dopo aver configurato il tuo dominio, è buona idea assicurare l’interfaccia di amministrazione o anche il resto del tuo blog utilizzando HTTPS. Si consiglia la protezione dell’interfaccia di amministrazione con HTTPS perchè username e password sono tramessi in testo normale se non si attiva la crittografia.

L'esempio seguente mostra come configurare SSL. Partiamo dal presupposto che segui questa guida dall'inizio e quindi stai utilizzando nginx come server proxy. La configurazione con un altro server proxy sarebbe molto simile.

Prima bisogna ottenere un certificato SSL da un fornitore di certificati affidabile. Il tuo fornitore ti darà istruzioni per generare la tua chiave privata e CRS (certificate signing request). Dopo aver ricevuto il certificato, copia il file CRT dal tuo fornitore di certificato e il KEY file generato durante la trasmissione del CSR al server.

- `mkdir /etc/nginx/ssl`
- `cp server.crt /etc/nginx/ssl/server.crt`
- `cp server.key /etc/nginx/ssl/server.key`

Dopo che questi due file sono a posto, è necessario aggiornare la configurazione di nginx.

*   Apri il file di configurazione di nginx con un editor di testo (per esempio `sudo nano /etc/nginx/sites-available/ghost.conf`)
*   Aggiungi le impostazioni indicate qui sotto con `+` al tuo file di configurazione

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

    *   Riavvia nginx

    ```
    $ sudo service nginx restart
    ```

Dopo questi passi, dovrebbe essere possibile aprire la pagina di amministrazione del tuo blog attraverso un collegamento sicuro con HTTPS. Se vuoi che tutto il tuo traffico utilizzi SSL, è possibile modificare il protocollo di impostazioni url nel file config.js a https (per esempio, 'url' https://my-ghost-blog.com '`). Questo forzerà l'uso di SSL per frontend e admin. Qualsiasi richiesta tramite HTTP verrà reindirizzata a HTTPS. Includere delle immagini nei tuoi post che provengono da un dominio HTTP farà apparire l'avvertimento 'insecure content'. Script e font da domini HTTP non funzioneranno.

Nella maggior parte dei casi vorrai forzare SSL per l'interfaccia di amministrazione e frontend per servire via HTTP e HTTPS. L'opzione `forceAdminSSL: true` è stata introdotta per forzare SSL nella pagina di amministrazione.

Se hai bisogno di ulteriori informazioni sulla configurazione di SSL per il tuo server proxy, la documentazione ufficiale [nginx](http://nginx.org/en/docs/http/configuring_https_servers.html) e [apache](http://httpd.apache.org/docs/current/ssl/ssl_howto.html) sono il posto perfetto per iniziare.
