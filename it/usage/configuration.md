---
lang: it
layout: usage
meta_title: Come usare Ghost - Documentazione Ghost
meta_description: Una guida dettagliata sull'utilizzo di Ghost. Hai installato Ghost ma non sai come procedere? Inizia da qui!
heading: Usare Ghost
subheading: Finding your way around, and getting set up the way you want
chapter: usage
section: configuration
permalink: /it/usage/faq/
prev_section: usage
next_section: settings
---


## Configurare Ghost <a id="configuration"></a>

Dopo aver lanciato Ghost per la prima volta, troveri un file chiamato `config.js` nella cartella principale di Ghost, insieme al file `index.js`. Questo file ti permette di configurare cose come il tuo URL, il database e le impostazioni delle email a livello di ambiente di sviluppo.

Se non hai ancora lanciato Ghost per la prima volta, non avrai ancora questo file. Puoi crearne uno copiando il file `config.example.js` - che &egrave; ci&ograve; che fa Ghost.

Per il configurare il tuo URL di Ghost, le impostazioni di email e database, apri `config.js` con il tuo editor preferito, e inizia a cambiare le impostazioni per il tuo ambiente preferito. Se ancora non hai mai avuto a che fare con gli ambienti, leggi la documentazione seguente.

## Approposito degli Ambienti <a id="environments"></a>

Node.js, e di conseguenza Ghost, incorpora il concetto di ambienti. Gli ambienti ti permettono di crare diverse configurazioni per le diverse modalit&agrave; in cui potresti voler lanciare Ghost. Di default Ghost ha due modalit&agrave; incorporate: **development** e **production**.

Ci sono poche, piccole differenze tra le due modalit&agrave; o ambienti. Essenzialmente **development** &egrave; orientata verso lo sviluppo e il debug di Ghost. Invece "production" &egrave; pensata per essere utilizzata per il lancio di Ghost al pubblico. Le differenze includono cose come i messaggi di log ed errori mostrati, e quante risorse statiche sono contatenate e minimizzate. In **production**, avrai un solo file Javascript contenente tutto il codice per l'amministrazione, in **development** ne avrai invece diversi.

Con il progresso di Ghost, queste differenze aumenteranno e diventeranno pi&ugrave; visibili, e oltretutto diventer&agrave; pi&ugrave; importante che ogni blog pubblico venga lanciato in ambiente **production**. Questo potrebbe sollevare la domanda, perch&egrave; la modalit&agrave; di default &egrave; **development**, se la maggior parte di persone utilizza la modalit&agrave; **production**? Ghost usa **development** come default poich&egrave; questo &egrave; il miglior ambiente per testare problemi, per cui ne avrai bisogno quando lancerai Ghost per la prima volta.

##  Utilizzare gli Ambienti <a id="using-env"></a>

Per configurare Ghost in diversi ambienti, devi utilizzare una variabile ambiente. Per esempio se normalmente lanci Ghost con `node index.js` utilizzerai:

`NODE_END=production node index.js`

O se utilizzi forefer:

`NODE_ENV=production forever start index.js`

O se abitualmente utilizzi `npm start` potresti utilizzare la pi&ugrave; da ricordare:

`npm start --production`

### Perch&egrave; utilizzare `npm install --production`?

Ci hanno chiesto alcune volte perch&egrave;, se Ghost viene avviato in modalit&agrave; development di default, la documentazione sull'installazione dice di lanciare `npm install --production`? Questa &egrave; un'ottima domanda! Se non includi `--production` quando installi Ghost, non succeder&agrave; niente di male, ma installerai una tonnellata di pacchetti extra che di base sono utili solo per le persone che vogliono sviluppare il core di Ghost. Questo necessita anche di un pacchetto particolare, `grunt-cli` installato globalmente, che deve essere installato con `npm install -g grunt-cli`, &egrave; uno step in pi&ugrave; non &egrave; necessario se vuoi utilizzare Ghost solo come blog.

