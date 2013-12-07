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

### Installare Node

*   Si può procedere in due modi: scaricare l'archivio `.tar.gz` da [http://nodejs.org](http://nodejs.org), oppure puoi seguire le istruzioni per [installare dal package manager](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager).
*   Controlla di avere Node e npm installati, digitando nel terminale, prima `node -v`, controllare di avere Node.js installato, e `npm -v` per verificare di aver installato npm.

### Installare ed eseguire Ghost

*  Registrati su [http://ghost.org](http://ghost.org), e clicca sul pulsante blu 'Scarica Ghost codice sorgente'(Download Ghost Source Code).
*  Nella pagina dei download, premi il pulsante per scaricare l'ultimo file zip ed estrailo nella cartella da cui vuoi eseguire Ghost.
*  Nel terminale, raggiungi ed entra nella cartella dove hai estratto Ghost.
*  Nel terminale digita `npm install --production` <span class="note">nota i due trattini</span>.
*  Quando npm ha ultimato l'installazione, digita `npm start` per avviare Ghost in modalità sviluppo (development mode).
*  Nel browser, digita nella barra dell'url <code class="path">127.0.0.1:2368</code> per vedere il tuo blog Ghost fresco d'installazione.
*  Cambia l'url con <code class="path">127.0.0.1:2368/ghost</code> e crea l'utente amministratore per loggarti come tale.

Se usi linux come utente ospite o attraverso il protocollo SSH e hai a disposizione solo il terminale, allora:

* Con il tuo sistema operativo, trova l'url del file Ghost zippato (cambia con ogni versione), salva l'url ma cambia '/zip/' con '/archives/'
* Nel terminale digita `wget url-of-ghost.zip` per scaricare Ghost.
* Estrai l'archivio con `unzip -uo Ghost-#.#.#.zip -d ghost`, e successivamente digita `cd ghost`
* Digita `npm install --production` per installare Ghost <span class="note">nota i due trattini</span>
* Quando npm ha ultimato l'installazione, digita `npm start` per avviare Ghost in modalità sviluppo (development mode).
* Ghost è in esecuzione in locale (localhost)
