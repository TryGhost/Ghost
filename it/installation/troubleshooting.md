---
lang: it
layout: installation
meta_title: Come installare Ghost sul tuo server - Documentazione Ghost
meta_description: Tutto il necessario per far funzionare la piattaforma di blogging Ghost in locale e in remoto.
heading: Installazione di Ghost &amp; Primi passi
subheading: I primi passi per installare il tuo nuovo blog per la prima volta.
permalink: /it/installation/troubleshooting/
chapter: installation
section: troubleshooting
prev_section: upgrading
---


# Troubleshooting & FAQ <a id="troubleshooting"></a>

<dl>
    <dt id="export-path">'/usr/local/bin' non appare in $PATH</dt>
    <dd>Puoi aggiungerlo come segue:
        <ul>
            <li>Da terminale digita <code>cd ~</code>, ti porterà alla tua cartella home (per digitare il carattere ~ con la tastiera italiana, premi ALT + 126 o ALT + 5 su Mac~)</li>
            <li>Ora digita <code>ls -al</code> per mostrare tutti i files e le sottocartelle in questa cartella, inclusi quelli nascosti</li>
            <li>Dovresti vedere un file <code class="path">.profile</code> o <code class="path">.bash_profile</code>, in caso contrario digita <code>touch .bash_profile</code> per crearlo</li>
            <li>Successivamente digita <code>open -a Textedit .bash_profile</code> per aprire il file con Textedit.</li>
            <li>Aggiungi <code>export PATH=$PATH:/usr/local/bin/</code> alla fine del file e salvalo</li>
            <li>Questa nuova configurazione sarà caricata al prossimo avvio di una nuova finestra di terminale, quindi apri una nuova scheda o finestra di terminale e digita <code>echo $PATH</code> per verificare che '/usr/local/bin/' sia ora presente.</li>
        </ul>
    </dd>
    <dt id="sqlite3-errors">SQLite3 non si installa</dt>
    <dd>
        <p>Il pacchetto SQLite3 comprende binari precompilati per le più comuni architetture. Se stai usando una distro Linux meno popolare o altri sistemi Unix-like, potresti ottenere da SQLite3 un errore 404 in quanto non è in grado di trovare i binari per la tua piattaforma.</p>
        <p>La soluzione è forzare la ricompilazione di SQLite3. Ti occorreranno Python e gcc. Prova ad eseguire <code>npm install sqlite3 --build-from-source</code></p>
        <p>In caso di errore probabilmente ti mancano dipendenze di Python o di gcc: su Linux prova ad eseguire <code>sudo npm install -g node-gyp</code>, <code>sudo apt-get install build-essential</code> e <code>sudo apt-get install python-software-properties python g++ make</code> prima di riprovare a compilare il sorgente.</p>
        <p>Per ulteriori informazioni sulla compilazione consulta: <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries">https://github.com/developmentseed/node-sqlite3/wiki/Binaries</a></p>
        <p>Una volta compilati i binari per la tua piattaforma, segui le <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries#creating-new-binaries">istruzioni qui</a> per inoltrare i binari al progetto node-sqlite, affinché i futuri utenti non incorrano nello stesso problema.</p>
    </dd>
    <dt id="image-uploads">Non riesco a fare l'upload delle immagini</dt>
    <dd>
        <p>Se utilizzi una Droplet di DigitalOcean con Ghost v0.3.2 installato o se usi nginx su altre piattaforme, potrebbe risultarti impossibile l'upload delle immagini.</p>
        <p>In realtà non riesci a caricare immagini oltre 1MB (prova un'immagine più piccola, vedrai che funzionerà). Un limite piuttosto basso!</p>
        <p>Per incrementare il limite devi modificare il file di configurazione di nginx impostando il nuovo limite.</p>
        <ul>
            <li>Accedi al tuo server e digita <code>sudo nano /etc/nginx/conf.d/default.conf</code> per aprire il file di configurazione.</li>
            <li>Dopo la riga con <code>server_name</code> aggiungi: <code>client_max_body_size 10M;</code></li>
            <li>Infine premi <kbd>ctrl</kbd> + <kbd>x</kbd> per uscire; nano ti chiederà se vuoi salvare, quindi digita <kbd>y</kbd> per acconsentire e premi <kbd>Invio</kbd> per salvare il file.</li>
        </ul>
    </dd>
</dl>

