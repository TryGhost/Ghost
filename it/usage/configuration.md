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

## Opzioni di configurazione

Ghost ha una serie di opzioni di configurazione che puoi aggiungere per cambiare come Ghost funziona.

### Email

Forse il pezzo più importante della configurazione è la creazione di e-mail in modo che Ghost può aiutarti a reimpostare il tuo password in caso si dimentica. Leggi la [documentazione email] per ulteriori informazioni.

### Database

Per impostazione predefinita, Ghost viene configurato per utilizzare un database SQLite, che non richiede configurazione da parte vostra.

Se invece vuoi utilizzare un database MySQL, puoi farlo modificando la configurazione del database. È necessario prima di tutto creare un database e utente, e dopodiché modificare la configurazione sqlite3 esistente a qualcosa cosi:

```
database: {
  client: 'mysql',
  connection: {
    host     : '127.0.0.1',
    user     : 'your_database_user',
    password : 'your_database_password',
    database : 'ghost_db',
    charset  : 'utf8'
  }
}
```

Inoltre, se vuoi puoi limitare il numero di connessioni simultanee, utilizzando l'impostazione `pool`.

```
database: {
  client: ...,
  connection: { ... },
  pool: {
    min: 2,
    max: 20
  }
}
```

### Server

Il host del server e la porta del server sono l'indirizzo IP e numero di porta dove Ghost ascolta per le richieste. 

È anche possibile configurare Ghost per ascoltare invece su un socket Unix cambiando la configurazione del server a qualcosa simile a:

```
server: {
    socket: 'path/to/socket.sock'
}
```

### Aggiornamenti

Ghost 0.4 ha introdotto un servizio di aggiornamento automatico che ti dice quando c'è una nuova versione di Ghost (che bello!). Ghost.org raccoglie statistiche d'uso anonime dalle richieste di aggiornamento. Per ulteriori informazioni, vedi il file [update-check.js](https://github.com/TryGhost/Ghost/blob/master/core/server/update-check.js) nel Ghost core.

È possibile disattivare il servizio di aggiornamento automatico e la raccolta di statistiche anonime cambiando questa opzione:

`updateCheck: false`

Per favore iscriviti per ricevere email da Ghost, o il [Ghost blog](http://blog.ghost.org), per essere aggiornato sulle nuove versioni.

### Spazio di archiviazione

Alcune piattaforme come Heroku non hanno un file system permanente. Ciò risulta alla perdita ad un certo punto di immagini caricate.
È possibile disattivare l'archiviazione di file di Ghost:

`fileStorage: false`

Quando archiviazione di file è disattivata, il applet per caricare immagini di Ghost vi chiederà di inserire un URL per impostazione predefinita, impedendo in tal modo di caricare file che saranno perse.


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

