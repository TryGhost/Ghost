---
lang: it
layout: installation
meta_title: Come installare Ghost sul tuo server - Documentazione Ghost
meta_description: Tutto il necessario per far funzionare la piattaforma di blogging Ghost in locale e in remoto.
heading: Installazione di Ghost &amp; Primi passi
subheading: I primi passi per installare il tuo nuovo blog per la prima volta.
permalink: /it/installation/linux/
chapter: installation
section: linux
prev_section: windows
next_section: deploy
---


# Installazione su Linux <a id="install-linux"></a>

<p class="note"><strong>Nota</strong> Ghost richiede Node.js <strong>0.10.x</strong> (l'ultima versione stabile). Ti raccomandiamo Node.js <strong>0.10.30</strong> e npm <strong>1.4.21</strong>.</p>

### Installare Node

*   Puoi procedere in due modi: scaricando l'archivio `.tar.gz` da [http://nodejs.org](http://nodejs.org), oppure seguendo le istruzioni per [installare dal package manager](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager).
*   Controlla di avere Node.js e npm installati, digitando nel terminale, prima `node -v`, per controllare di avere Node.js installato, e `npm -v` per verificare di aver installato npm.

### Installare ed eseguire Ghost

**Se stai usando Linux sul tuo desktop, segui le seguenti istruzioni:**

*  Nella [pagina dei download](https://ghost.org/download/), premi sul pulsante per scaricare il file zip più recente ed estrailo nella cartella da cui vuoi eseguire Ghost.


**Se hai accesso a Linux soltanto come ospite o tramite ssh, e quindi hai a disposizione soltanto il terminale, allora segui queste istruzioni:**

*   Scarica l'ultima versione di Ghost:

    ```
    $ curl -L https://ghost.org/zip/ghost-latest.zip -o ghost.zip
    ```

*   Estrai l'archivio:

    ```
    $ unzip -uo ghost.zip -d ghost
    ```


**Una volta che hai estratto Ghost apri un terminale, se non l'hai già fatto, e poi:**

*   Spostati nella cartella nella quale è stato estratto Ghost:

    ```
    $ cd /percorso/cartella/ghost
    ```

*   Installa Ghost:

    ```
    npm install --production
    ```
    <span class="note">Fai attenzione ai due trattini</span>

*   Quando npm ha terminato l'installazione, usa questo comando per eseguire Ghost in modalità sviluppo:

    ```
    $ npm start
    ```

*   Ghost sarà in esecuzione all'indirizzo **127.0.0.1:2368**<br />
    <span class="note">Puoi cambiare l'indirizzo IP e la porta nel file **config.js**</span>

*   Nel browser, visita [http://127.0.0.1:2368](http://127.0.0.1:2368) per vedere il tuo blog Ghost appena installato.
*   Visita [http://127.0.0.1:2368/ghost](http://127.0.0.1:2368/ghost) e crea un utente amministratore per poter entrare nel pannello di amministrazione.
