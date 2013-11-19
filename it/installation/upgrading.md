---
lang: it
layout: installation
meta_title: Come installare Ghost sul tuo server - Documentazione Ghost
meta_description: Tutto il necessario per far funzionare la piattaforma di blogging Ghost in locale e in remoto.
heading: Installazione di Ghost &amp; Primi passi
subheading: I primi passi per installare il tuo nuovo blog per la prima volta.
permalink: /it/installation/upgrading/
chapter: installation
section: upgrading
prev_section: deploy
next_section: troubleshooting
---

# Aggiornare Ghost <a id="upgrade"></a>

Aggiornare Ghost è una vera passeggiata.

Ci sono un paio di modi. Verranno prima descritti i passi generici da seguire, e poi nel dettaglio come procedere in maniera [punta e clicca](#how-to) e [linea di comando](#cli), in modo che tu possa scegliere il metodo con il quale ti trovi meglio.

<p class="note"><strong>Fai un Backup!</strong> Prima di aggiornare è sempre bene effettuare un backup. Prima leggi <a href="#backing-up">come eseguire un backup</a>!</p>

## Panoramica

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/folder-structure.png" style="float:left" />

Ghost, una volta installato, ha una struttura simile a quella mostrata sulla sinistra. Ci sono due cartelle principali <code class="path">content</code> e <code class="path">core</code>, più alcuni file nella root.

Aggiornare Ghost significa semplicemente sostituire i file vecchi con quelli nuovi, ri-eseguire `npm install` per aggiornare le dipendenze nella cartella <code class="path">node_modules</code> e poi far ripartire Ghost in modo che le modifiche abbiano effetto.

Ricordati, Ghost di default salva tutti i tuoi dati (temi, immagini, etc) nella cartella <code class="path">content</code>, quindi fai attenzione a non toccarla! Sostituisci solo i file nella cartella <code class="path">core</code> e nella root, e tutto andrà bene.

## Come eseguire un backup <a id="backing-up"></a>

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/export.png" style="float:right" />

*   Per fare il backup di tutti i tuoi dati nel database, fai il login in Ghost e vai alla pagina <code class="path">/ghost/debug/</code>. Premi il pulsante "Export" per scaricare un file JSON contenente tutti i tuoi dati. Fatto.
*   Per fare il backup dei tuoi temi e le immagini che hai caricato, devi fare una copia di tutti i file che trovi nelle cartelle <code class="path">content/themes</code> e <code class="path">content/images</code>.

<p class="note"><strong>Nota:</strong> Se vuoi, puoi fare una copia del database direttamente dalla cartella <code class="path">content/data</code> ma Ghost <strong>non deve</strong> essere in esecuzione. Per favore, prima termina il processo.</p>


## Come effettuare l'aggiornamento <a id="how-to"></a>

Come fare l'aggiornamento sulla tua macchina locale.

<p class="warn"><strong>ATTENZIONE:</strong> <strong>NON</strong> copiare e incollare tutta la cartella Ghost in un'installazione esistente su mac. <strong>NON</strong> scegliere <kbd>SOSTITUISCI</kbd> se stai facendo l'upload con transmit o altri software FTP, scegli <strong>UNISCI</strong>.</p>

*   Scarica l'ultima versione di Ghost da [Ghost.org](http://ghost.org/download/)
*   Estrai lo zip in una posizione temporanea
*   Copia tutti i file che stanno nella root e incollali nella tua installazione. I file sono: index.js, package.json, Gruntfile.js, config.example.js, la licenza e il readme
*   Poi sostituisci la vecchia cartella <code class="path">core</code> con la nuova cartella `core`
*   Per le release che includono un aggiornamento di Casper (il tema di default), sostituisci la vecchia cartella <code class="path">content/themes/casper</code> con quella nuova
*   Esegui `npm install --production`
*   Infine, fai ripartire Ghost in modo che le modifiche abbiano effetto

## Linea di comando <a id="cli"></a>

<p class="note"><strong>Fai un Backup!</strong> Prima di aggiornare è sempre bene effettuare un backup. Prima leggi <a href="#backing-up">come eseguire un backup</a>!</p>

### Linea di comando su mac <a id="cli-mac"></a>

Lo screencast qua sotto mostra come aggiornare Ghost ponendo che il file zip sia stato scaricato nella cartella <code class="path">~/Downloads</code> e che Ghost sia installato in <code class="path">~/ghost</code>. <span class="note">**Nota:** `~` indica la cartella home su mac e linux</span>

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/upgrade-ghost.gif)

I passi nello screencast sono:

*   <code class="path">cd ~/Downloads</code> - spostati nella cartella Downloads dove è stata scaricata l'ultima versione di Ghost
*   `unzip ghost-0.3.1.zip -d ghost-0.3.3` - estrai ghost nella cartella <code class="path">ghost-0.3.3</code>
*   <code class="path">cd ghost-0.3.3</code> - spostati nella cartella <code class="path">ghost-0.3.3</code>
*   `ls` - mostra tutti i file e le cartelle nella posizione corrente
*   `cp *.md *.js *.txt *.json ~/ghost` - copia tutti i file .md .js .txt e .json da <code class="path">~/ghost</code>
*   `cp -R core ~/ghost` - copia la cartella <code class="path">core</code> e tutto il suo contenuto all'interno di <code class="path">~/ghost</code>
*   `cp -R content/themes/casper ~/ghost/content/themes` - copia la cartella <code class="path">casper</code> e tutto il suo contenuto all'interno di <code class="path">~/ghost/content/themes</code>
*   `cd ~/ghost` - spostati nella cartella <code class="path">~/ghost</code>
*   `npm install --production` - installa Ghost
*   `npm start` - lancia Ghost

### Linea di comando su server linux <a id="cli-server"></a>

*   Prima di tutto devi trovare l'URL dalla quale scaricare l'ultima release di Ghost. Dovrebbe essere simile a `http://ghost.org/zip/ghost-latest.zip`
*   Scarica lo zip con `wget http://ghost.org/zip/ghost-latest.zip` (sostituisci l'URL con quella corretta, se necessario)
*   Scompatta l'archivio con `unzip -uo ghost-0.3.*.zip -d path-to-your-ghost-install`
*   Esegui `npm install --production` per installare nuove dipendenze
*   Infine, fai ripartire Ghost in modo che le modifiche abbiano effetto

**Inoltre**, [howtoinstallghost.com](http://www.howtoinstallghost.com/how-to-update-ghost/) fornisce ulteriori istruzioni su come installare Ghost su un server linux.

### Come aggiornare una Droplet su DigitalOcean <a id="digitalocean"></a>

<p class="note"><strong>Fai un Backup!</strong> Prima di aggiornare è sempre bene effettuare un backup. Prima leggi <a href="#backing-up">come eseguire un backup</a>!</p>

*   Prima di tutto devi trovare l'URL dalla quale scaricare l'ultima release di Ghost. Dovrebbe essere simile a `http://ghost.org/zip/ghost-latest.zip`
*   Nella console della tua droplet esegui `cd /var/www/` per spostarti dove c'è la tua installazione di Ghost
*   Scarica lo zip con `wget http://ghost.org/zip/ghost-latest.zip` (sostituisci l'URL con quella corretta, se necessario)
*   Scompatta l'archivio con `unzip -uo ghost-0.3.*.zip -d path-to-your-ghost-install`
*   Assicurati che tutti i file abbiano i permessi corretti con `chown -R ghost:ghost ghost/*`
*   Esegui `npm install` per installare nuove dipendenze
*   Infine, fai ripartire Ghost in modo che le modifiche abbiano effetto con `service ghost restart`

## Come aggiornare Node.js all'ultima versione <a id="upgrading-node"></a>

Se hai installato Node.js dal sito [Node.js](nodejs.org), puoi effettuare l'aggiornamento semplicemente scaricando e lanciando l'installer più recente. La versione attualmente installata verrà sostituita dall'ultima versione.

Se usi Ubuntu, od un'altra distribuzione linux dotata di `apt-get`, il comando per aggiornare node è uguale a quello per fare l'installazione: `sudo apt-get install nodejs`.

**Non** hai bisogno di riavviare il server o Ghost.
