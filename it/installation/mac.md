---
lang: it
layout: installation
meta_title: Come installare Ghost sul tuo server - Documentazione Ghost
meta_description: Tutto il necessario per far funzionare la piattaforma di blogging Ghost in locale e in remoto.
heading: Installazione di Ghost &amp; Primi passi
subheading: I primi passi per installare il tuo nuovo blog per la prima volta.
permalink: /it/installation/mac/
chapter: installation
section: mac
prev_section: installation
next_section: windows
---


# Installazione su Mac <a id="install-mac"></a>

<p class="note"><strong>Nota</strong> Ghost richiede Node.js <strong>0.10.x</strong> (l'ultima versione stabile). Ti raccomandiamo Node.js <strong>0.10.30</strong> e npm <strong>1.4.21</strong>.</p>

Per installare Node.js e Ghost sul tuo Mac avrai bisogno di una finestra aperta del Terminale. Puoi aprirne una con Spotlight scrivendo "Terminale".

### Installazione di Node.js

*   Sul sito [http://nodejs.org](http://nodejs.org) premi install per scaricare un file '.pkg'.
*   Clicca su download per aprire l'installer, che installerà sia Node.js che npm (il gestore di pacchetti di Node.js).
*   Avanza nelle fasi di installazione ed alla fine inserisci la tua password e clicca 'install software'.
*   Una volta che l'installazione è completata, torna nel terminale e scrivi `echo $PATH`. Assicurati che '/usr/local/bin/' sia nel tuo path.

<p class="note"><strong>Nota:</strong> Se '/usr/local/bin' non è presente nel tuo $PATH, dai un'occhiata alla <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting#export-path">risoluzione dei problemi</a> per capire come aggiungerlo.</p>

Se hai problemi e non sai come andare avanti puoi guardare [l'intero processo in azione qui](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Installa Node.js sul Mac").

### Installa e Lancia Ghost

*   Nella [pagina download](https://ghost.org/download/), premi il pulsante per scaricare il file zip più recente.
*   Clicca sulla freccia a fianco del file appena scaricato, e seleziona 'Mostra nel Finder'.
*   Nel Finder, fai doppio-click sullo zip scaricato per estrarlo.
*   Dopodich&egrave;, prendi la cartella 'ghost-#.#.#' appena estratta e trascinala nella barra delle tab del terminale, in modo che venga aperta un nuovo pannello del terminale nella posizione corretta.
*   Nel nuovo pannello scrivi `npm install --production` <span class="note">fai attenzione ai due trattini</span>.
*   Quando npm ha terminato l'installazione, scrivi `npm start` per lanciare Ghost in modalità sviluppo (development mode).
*   Apri il tuo browser preferito e vai alla pagina <code class="path">127.0.0.1:2368</code> per vedere il tuo nuovo Blog Ghost.
*   Visita la pagina <code class="path">127.0.0.1:2368/ghost</code> per creare un utente amministratore e loggarti all'interno di Ghost.
*   Guarda la [documentazione sull'utilizzo](/usage) per i prossimi passi.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)

