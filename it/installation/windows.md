---
lang: it
layout: installation
meta_title: Come installare Ghost sul tuo server - Documentazione Ghost
meta_description: Tutto il necessario per far funzionare la piattaforma di blogging Ghost in locale e in remoto.
heading: Installazione di Ghost &amp; Primi passi
subheading: I primi passi per installare il tuo nuovo blog per la prima volta.
permalink: /it/installation/windows/
chapter: installation
section: windows
prev_section: mac
next_section: linux
---

# Installazione su Windows <a id="install-windows"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

### Installare Node.js

*   Su [http://nodejs.org](http://nodejs.org) clicca installa, per scaricare il file '.msi'.
*   Clicca sul file scaricato per aprire il programma di installazione; in questo modo installi sia Node.js che npm.
*   Prosegui con le istruzioni mostrate dal programma di installazione, fino a quando sullo schermo non comparirà un messaggio che conferma l'installazione per Node.js.

Se hai problemi in questa fase, guarda tutto [questo video](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-win.gif "Installa node su Windows"), ti può aiutare.

### Scarica ed estrai Ghost

*   Nella [pagina dei download](https://ghost.org/download/), premi sul pulsante per scaricare l'ultimo file zip.
*   Clicca sulla freccia 'next' (avanti) per scaricare il file più recente, e scegli 'mostra nella cartella'.
*   Quando si apre la cartella, clicca con il pulsante destro del mouse sul file zip scaricato e scegli 'Estrai tutto'.

Se hai problemi, guarda il video per l'intero [processo passo dopo passo](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win.gif "Installare Ghost su Windows - Parte 1").

### Installa ed Esegui Ghost

*   Nel tuo menu Start, cerca 'Node.js' e scegli la voce 'Node.js Command Prompt' (Prompt dei comandi Node.js).
*   Nel prompt dei comandi di Node, devi posizionarti all'interno della cartella dove hai estratto Ghost. Digita: `cd Downloads/ghost-#.#.#` (sostituisci gli hash con la versione di Ghost che hai scaricato).
*   Ora, nel prompt dei comandi, digita `npm install --production` <span class="note">fai atttenzione ai due trattini</span>.
*   Quando npm ha terminato di installare, digita `npm start` per avviare Ghost in modalità sviluppo (development mode).
*   Nel browser, digita nella barra dell'url <code class="path">127.0.0.1:2368</code> per vedere il tuo blog Ghost funzionante
*   Nella barra dell'url, digita <code class="path">127.0.0.1:2368/ghost</code> e crea il tuo utente amministratore per loggarti e gestire la tua installazione di Ghost, in modalità sviluppo.
*   Vedi la [documentazione di riferimento](/usage) per altre istruzioni successive

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win-2.gif "Installare Ghost su Windows - Parte 2")
