---
lang: it
layout: usage
meta_title: Come usare Ghost - Documentazione Ghost
meta_description: Una guida approfondita all'utilizzo della piattaforma di blogging Ghost. Hai Ghost ma non sai da dove cominciare? Parti da qui!
heading: Usare Ghost
subheading: Configura la tua installazione
chapter: usage
section: configuration
permalink: /it/usage/configuration/
prev_section: usage
next_section: settings
---


## Configurare Ghost <a id="configuration"></a>

Quando lanci Ghost per la prima volta, troverai un file chiamato `config.js` nella directory root di Ghost, insieme ad `index.js`. Questo file ti permette di gestire i settaggi per ogni ambiente come l'URL, il database, ed i parametri mail.

Se non hai ancora lanciato Ghost per la prima volta, questo file non sarà ancora stato creato. Puoi crearlo copiando `config.example.js` - proprio quello che fa Ghost quando viene installato. 

Per configurare la tua URL, la mail o il database, apri `config.js` nel tuo editor preferito, e comincia a cambiare i settaggi per l'ambiente desiderato. Se gli ambienti non sono qualcosa che ti suona familiare, leggi la documentazione qua sotto.

## Due parole sugli Ambienti <a id="environments"></a>

Node.js, e di conseguenza Ghost, hanno il concetto di ambiente. Gli ambienti ti permettono di usare configurazioni diverse per ogni modalità d'esecuzione con il quale viene lanciato Ghost. Di default Ghost ha due modalità: **development** (sviluppo) e **production** (produzione).

Ci sono alcune, sottili differenze fra le due modalità (o ambienti). Essenzialmente **development** è indicata per sviluppare e soprattutto debuggare Ghost. D'altro canto **production** è pensata per quando lanci Ghost pubblicamente. Le differenze includono come gli errori ed i messaggi di log vengono mostrati, e quanto gli assets statici vengono concatenati e minificati. In **production**, ottieni un singolo file Javascript contenente tutto il codice per l'admin, in **development** ce ne sono diversi.

Mano a mano che Ghost matura, queste differenze diventeranno più sostanziali, e di conseguenza diventerà sempre più importante che ogni istanza di Ghost lanciata pubblicamente utilizzi l'ambiente **production**. Questo forse porta a pensare, perchè la modalità **development** è la modalità di default se la maggior parte delle persone vogliono lanciare Ghost in modalità **production**? Ghost ha **development** come default perchè è l'ambiente migliore per debuggare problemi, e tornerà utile durante la tua prima installazione.

##  Utilizzare gli Ambienti <a id="using-env"></a>

Per lanciare Ghost in un ambiente differente, devi usare una variabile d'ambiente. Se normalmente, per esempio, lanci Ghost con `node index.js` quello che dovresti usare è:

`NODE_ENV=production node index.js`

O se usi forever:

`NODE_ENV=production forever start index.js`

Oppure se usi `npm start` puoi utilizzare:

`npm start --production`

### Perchè usare `npm install --production`?

Ci è stato chiesto un po' di volte, perchè installare Ghost con `npm install --production` se Ghost parte in modalità development di default? Ottima domanda! Se non includi `--production` quando installi Ghost, non succederà nulla di brutto, ma verranno installati una marea di pacchetti extra che sono utili soltanto a chi vuole sviluppare il core di Ghost. Inoltre è richiesto che tu abbia installato globalmente un ulteriore pacchetto, `grunt-cli`. Può essere installato con `npm install -g grunt-cli`, è un passaggio in più e non è necessario se si vuole utilizzare Ghost soltanto come blog.

