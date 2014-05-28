---
lang: it
layout: themes
meta_title: Realizzare temi per Ghost - Documentazione Ghost
meta_description: Una guida approfondita sulla realizzazione di temi per la piattaforma di blogging Ghost. Tutto quello che c'è da sapere sui temi per Ghost.
heading: Temi per Ghost
subheading: Inizia subito a creare i tuoi temi per Ghost
chapter: themes
---

{% raw %}

## Cambiare Tema <a id="switching-theme"></a>

I temi di Ghost si trovano nella cartella <code class="path">content/themes/</code>

Se vuoi usare un tema differente da quello di default (Casper), dai un'occhiata ai temi presenti nel [marketplace](http://marketplace.ghost.org/). Scarica il pacchetto del tema che preferisci, estrailo e spostalo in <code class="path">content/themes</code> affianco a Casper.

Se vuoi realizzare un tuo tema, è raccomandabile copiare (scegliendo un altro nome) la cartella di Casper e modificare direttamente i templates al suo interno.

Per utilizzare il nuovo tema:

1.  Riavvia Ghost. Al momento, Ghost non è in grado di capire se è stata aggiunta una nuova cartella all'interno di <code class="path">content/themes</code> quindi è necessario riavviarlo
2.  Fai il login nel Pannello di Amministrazione, e spostati nei Settaggi Generali (<code class="path">/ghost/settings/general/</code>)
3.  Seleziona il tuo tema fra le opzioni del dropdown 'Theme'
4.  Clicca 'Save'
5.  Visita il Frontend e sbava davanti al tuo nuovo tema


##  Cos'è Handlebars? <a id="what-is-handlebars"></a>

[Handlebars](http://handlebarsjs.com/) è il linguaggio di templating usato da Ghost.

> Handlebars ha tutte le potenzialità per permetterti di scrivere templates semantici senza sforzo.

Se hai intenzione di realizzare un tuo tema, è bene che prima cominci a familiarizzare con la sintassi di Handlebars. Leggi la [documentazione di handlebars](http://handlebarsjs.com/expressions.html), o dai un'occhiata a questo [tutorial di Treehouse](http://blog.teamtreehouse.com/getting-started-with-handlebars-js) – puoi saltare la prima parte relativa all'installazione (ci abbiamo pensato noi) e cominciare da ‘Basic Expressions’.

## Temi per Ghost <a id="about"></a>

I temi per Ghost sono strutturati per essere semplici da sviluppare e mantenere. Viene posta particolare attenzione sulla separazione fra templates (HTML) e ogni altra business logic (JavaScript). Handlebars è (praticamente) logicless e favorisce questa separazione, tramite l'utilizzo di *helpers*, in modo che la logica legata a quale contenuti mostrare (business logic) rimanga separata e auto sufficiente. Questa separazione porta benefici nella collaborazione fra designers e developers quando si sviluppano temi.

I templates Handlebars sono gerarchici (un template può estenderne un altro) ed inoltre supportano i partials. Ghost sfrutta queste caratteristiche per evitare duplicazione del codice, in modo che ogni singolo template svolga una sola funzione, e la svolga bene. Un tema ben strutturato sarà più facile da mantenere e mantenere i componenti separati permette di utilizzarli anche in altri temi.

Ci auguriamo apprezzerai il nostro approccio nello sviluppare temi.

## Organizzazione dei files in un Tema <a id="file-structure"></a>

La struttura raccomandata è la seguente:

```
.
├── /assets
|   └── /css
|       ├── screen.css
|   ├── /fonts
|   ├── /images
|   ├── /js
├── default.hbs
├── index.hbs [required]
└── post.hbs [required]
```

Non è richiesto che `default.hbs sia presente, nè che esista alcuna delle cartelle suggerite. Si consiglia di mantenere i vostri elementi all'interno della cartella <code class="path">assets</code> facendo uso dell'[assistente `{{asset}}`] (# asset-helper) per fornire css, js, immagini, file di font e altri elementi. 

I template<code class="path">index.hbs</code> e <code class="path">post.hbs</code> sono gli unici file richiesti – Ghost non funzionerà senza questi due templates. 

### Partials <a id="partials"></a>

È inoltre possibile anche aggiungere la cartella <code class="path">partials</code> al tuo tema. Questa dovrebbe contenere tutti i templates di parti che hai intenzione di utilizzare nel tuo tema, per esempio <code class="path">list-post.hbs</code> che potrebbe essere il template di un singolo post in un listing, che quindi riutilizzerai per la homepage, e in futuro per le pagine archivio e tags. <code class="path">partials</code> è anche la cartella che puoi utilizzare per sovrascrivere i templates di default usati da alcuni helpers, come la paginazione. Il file <code class="path">pagination.hbs</code> all'interno di <code class="path">partials</code>ti permetterebbe di personalizzare l'HTML relativo alla paginazione, ad esempio.

### default.hbs

Questo è il template base che contiene il codice HTML che deve essere presente in ogni pagina – quindi i tag `<html>`, `<head>` e `<body>` tags insieme agli helpers `{{ghost_head}}` e `{{ghost_foot}}`, più il codice HTML necessario per avere un header ed un footer su ogni pagina.

Il template default contiene l'espressione handlebars `{{{body}}}` per indicare dove andrà a posizionarsi il contenuto dei templates che lo estendono.

I templates delle diverse pagine avranno quindi `{{!< default}}` all'inizio del file per specificare che estendono il template default, e che il loro contenuto dovrà apparire al posto di `{{{body}}}` nel template default.hbs.

### index.hbs

Questo è il template della homepage, ed estende <code class="path">default.hbs</code>. Alla homepage viene passata una lista di post da mostrare, e <code class="path">index.hbs</code> definisce come verranno mostrati.

In Casper (il tema di default), la homepage ha un enorme header che usa la variabile globale `@blog` per mostrare il logo, titolo e descrizione del blog. Poi, usando l'helper `{{#foreach}}`, viene mostrata la lista di post.

### post.hbs

Questo è il template per il post singolo, che a sua volta estende <code class="path">default.hbs</code>.

In Casper (il tema di default), il template del post singolo ha anch'esso un header, che utilizza la variabile globale `@blog`. Tutte le informazioni relative al post sono accessibili tramite `{{#post}}`, che viene usato per mostrare tutti i dettagli del singolo post.

### Stile e Anteprima del Post

Quando sviluppi temi per Ghost, fai attenzione alle classi, ed in particolare agli id, che utilizzi all'interno dell'HTML, in modo da evitare conflitti fra gli stili principali e quelli specifici di un post. Non puoi prevedere quali classi, ed in particolare quali id (Ghost genera automaticamente gli id per gli heading) verranno usati all'interno di un post. E' sempre meglio, quindi, essere il più specifici possibile, contestualizzando parti specifiche dellla pagina. Ad esempio, la regola #my-id potrebbe essere applicata ad elementi inaspettati, cosa che non succederebbe con #themename-my-id.

Ghost ti permette di avere un'anteprima realistica dei tuoi post all'interno dell'editor, ma è necessario caricare gli stili relativi al singolo post anche all'interno del Pannello di Amministrazione. Questa funzionalità non è ancora implementata, ma è caldamente consigliato mantenere separati gli stili del singolo post da tutti gli altri presenti nel tuo tema. Potresti utilizzare, rispettivamente, post.css e style.css in modo che da sfruttare immediatamente questa funzionalità quando sarà disponibile.

## Crea il tuo Tema <a id="create-your-own"></a>

Crea il tuo tema copiando (scegliendo un altro nome) la cartella di Casper o creando un'altra cartella all'interno di <code class="path">content/themes</code> con il nome del tuo tema, ad esempio my-theme (i nomi devono essere in minuscolo e costituiti solo da lettere, numeri e trattini). A questo punto, all'interno della nuova cartella, crea due file vuoti: index.hbs and post.hbs. Non verrà mostrato nulla, ma questo è un tema valido a tutti gli effetti.

### La lista di post

Ad <code class="path">index.hbs</code> viene passato un oggetto `posts` che può essere usato con l'helper foreach per mostrare una lista di post:

```
{{#foreach posts}}
// qui abbiamo accesso ad ogni singolo post
// tutto quello che inserisci qui verrà eseguito per ogni post
{{/foreach}}
```

Guarda la sezione dedicata all'helper [`{{#foreach}}`](#foreach-helper) per maggiori informazioni.

#### Paginazione

Guarda la sezione dedicata all'helper [`{{#pagination}}`](#pagination-helper).

### Mostrare i singoli post

Ciclando la lista di post con l'helper `foreach` o all'interno di <code class="path">post.hbs</code>, puoi accedere alle proprietà del singolo post.

Per questioni di tempo, eccone un elenco:

*   id – *post id*
*   title – *titolo post*
*   url – *URL relativa del post*
*   content – *post HTML*
*   published_at – *data in cui è stato pubblicato il post*
*   author – *dettagli sull'autore del post* (maggiori informazioni a seguire)

Tutte queste proprietà possono essere mostrate con i tag standard di handlebars, ad es. `{{title}}`.

<div class="note">
  <p>
    <strong>Note:</strong> <ul>
      <li>
        la proprietà content è sovrascritta dall'helper <code>{{content}}</code> che assicura che l'HTML sia corretto & sicuro. Guarda la sezione relativa all' <a href="#content-helper">helper <code>{{content}}</code></a> per maggiori informazioni.
      </li>
      <li>
        la proprietà url con l'helper <code>{{url}}</code>. Guarda la sezione relativa all' <a href="#url-helper">helper <code>{{url}}</code></a> per maggiori informazioni.
      </li>
    </ul>
  </p>
</div>

#### Autore del Post

All'interno del singolo post, hai accesso alle seguenti informazioni relative all'autore:

*   `{{author.name}}` – il nome dell'autore
*   `{{author.email}}` – l'indirizzo email dell'autore
*   `{{author.bio}}` – la bio dell'autore
*   `{{author.website}}` – il sito web dell'autore
*   `{{author.image}}` – l'immagine di profilo dell'autore
*   `{{author.cover}}` – l'immagine di copertina dell'autore

Puoi usare semplicemente `{{author}}` per mostrare il nome dell'autore.

Puoi ottenere lo stesso risultato utilizzando una block expression:

```
{{#author}}
    <a href="mailto:{{email}}">Email {{name}}</a>
{{/author}}
```

#### Tags del Post

All'interno del singolo post, hai accesso alle seguenti informazioni relative ai tags:

*   `{{tag.name}}` – il nome del tag

Puoi usare `{{tags}}` per mostrare la lista di tags separati da virgole o, se preferisci, specificare il separatore `{{tags separator=""}}`

Puoi ottenere lo stesso risultato utilizzando una block expression:

```
<ul>
    {{#foreach tags}}
        <li>{{name}}</li>
    {{/foreach}}
</ul>
```

### Variabili Globali

I temi in Ghost hanno accesso ad alcune variabili globali grazie al parametro `@blog`.

*   `{{@blog.url}}` – l'url specificata per l'ambiente corrente in <code class="path">config.js</code>
*   `{{@blog.title}}` – il titolo del blog dalla pagina di configurazione
*   `{{@blog.description}}` – la descrizione del blog dalla pagina di configurazione
*   `{{@blog.logo}}` – il logo del blog dalla pagina di configurazione

## Helpers predefiniti <a id="helpers"></a>

Ghost ha alcuni helpers predefiniti che ti forniscono gli strumenti necessari per sviluppare il tuo tema. Si distinguono in due tipi: block helpers e output helpers.

**[Block Helpers](http://handlebarsjs.com/block_helpers.html)** hanno un tag di apertura e uno di chiusura Es. `{{#foreach}}{{/foreach}}`. Il contesto cambia all'interno dei tags ed alcuni helpers forniscono proprietà addizionali alle quali puoi accedere tramite il simbolo `@`.

**Output Helpers** somigliano molto ai tag canonici utilizzati per mostrare dei dati es. `{{content}}`. Svolgono operazioni utili sui dati prima che vengano mostrati, e spesso ti danno la possibilità di specificare il formato con il quale i dati dovranno essere mostrati. Alcuni di questi helpers utilizzano i templates per definire l'HTML con il quale verranno mostrati i dati, un po' come avviene con i partials. Alcuni output helpers possono essere usati anche come block helpers, fornendo ulteriori funzionalità.

### <code>foreach</code> <a id="foreach-helper"></a>

*   Tipo Helper: block
*   Opzioni: `columns` (numero)

`{{#foreach}}` è un helper speciale utilizzato per ciclare sulle liste di post. Di default, l'helper `each` di handlebars fornisce le variabili private `@index` per gli array e `@key` per gli oggetti, che possono essere usate all'interno del ciclo.

`foreach` estende questo helper, ed aggiunge le seguenti proprietà `@first`, `@last`, `@even`, `@odd`, `@rowStart` and `@rowEnd` sia agli array che agli oggetti. Sfruttandole, possono essere creati layout più complessi, sia per le liste di post che per altri tipi di contenuto. Guarda i seguenti esempi:

#### `@first` & `@last`

Posto di avere a disposizione un array o un oggetto chiamato `posts`, possiamo controllare quale sia il primo elemento.

```
{{#foreach posts}}
    {{#if @first}}
        <div>Primo post</div>
    {{/if}}
{{/foreach}}
```

E' possibile anche annidare degli `if` per testare più proprietà. Qui siamo in grado di mostrare il primo e l'ultimo post separatamente dagli altri.

```
{{#foreach posts}}
    {{#if @first}}
    <div>Primo post</div>
    {{else}}
        {{#if @last}}
            <div>Ultimo post</div>
        {{else}}
            <div>Tutti gli altri post</div>
        {{/if}}
    {{/if}}
{{/foreach}}
```

#### `@even` & `@odd`

E' possibile aggiungere una classe a seconda della posizione dell'elemento (pari o dispari), per creare contenuti zebrati:

```
{{#foreach posts}}
        <div class="{{#if @even}}even{{else}}odd{{/if}}">{{title}}</div>
{{/foreach}}
```

#### `@rowStart` & `@rowEnd`

Tramite l'opzione columns, puoi specificare da quante colonne è costituito il layout. E' possibile creare un layout a griglia utilizzando le seguenti proprietà per individuare gli elementi all'inizio ed alla fine di ogni riga.

```
{{#foreach posts columns=3}}
    <li class="{{#if @rowStart}}first{{/if}}{{#if @rowEnd}}last{{/if}}">{{title}}</li>
{{/foreach}}
```

### <code>content</code> <a id="content-helper"></a>

*   Tipo Helper: output
*   Opzioni: `words` (numero), `characters` (numero) [di default viene mostrato tutto]

`{{content}}` è un helper molto semplice utilizzato per mostrare il contenuto di un post. La sua funzione è assicurare che l'HTML venga mostrato correttamente.

Puoi limitare il numero di parole o caratteri da mostrare tramite le opzioni:

`{{content words="100"}}` mostrerà soltanto 100 parole con i tag HTML correttamente posizionati.

### <code>excerpt</code> <a id="excerpt-helper"></a>

*   Tipo Helper: output
*   Options: `words` (numero), `characters` (numero) [di default mostra 50 parole]

`{{excerpt}}` mostra il contenuto rimuovendo tutto l'HTML. E' utile per creare un estratto di un post.

Puoi limitare il numero di parole o caratteri da mostrare tramite le opzioni:

`{{excerpt characters="140"}}` mostrerà soltanto 140 caratteri di testo.

### <code>date</code> <a id="date-helper"></a>

*   Tipo Helper: output
*   Opzioni: `format` (formato data, default “MMM Do, YYYY”), `timeago` (boleano)

`{{date}}` è un helper per mostrare le date in diversi formati. Puoi passargli come argomenti una data ed un formato in questo modo:

```
// mostrerà qualcosa di simile a 'Luglio 11, 2014'
{{date published_at format="MMMM DD, YYYY"}}
```

Oppure puoi passargli una data e settare il flag timeago a true:

```
// mostrerà qualcosa di simile a '5 minuti fa'
{{date published_at timeago="true"}}
```

Se usi `{{date}}` senza un formato, il formato di default sarà “MMM Do, YYYY”.

Se usi `{{date}}` quando il contesto è un post e non specifichi nessuna data come argomento, verrà usata `published_at`.

Se usi `{{date}}` quando il contesto non è un post e non specifichi nessuna data come argomento, verrà usata la data corrente.

`date` utilizza [moment.js](http://momentjs.com/) per formattare le date. Guarda la [documentazione](http://momentjs.com/docs/#/parsing/string-format/) per una spiegazione esaustiva dei differenti formati utilizzabili.

### <code>url</code> <a id="url-helper"></a>

*   Tipo Helper: output
*   Opzioni: `absolute`

Quando il contesto è un post, `{{url}}` mostra la sua URL relativa. Se il contesto non è un post, non mostrerà nulla.

Puoi mostrare url assolute utilizzando l'opzione absolute, Es. `{{url absolute="true"}}`

###  <code>pagination</code> <a href="pagination-helper"></a>

*   Tipo Helper: output, template-driven
*   Opzioni: nessuna (in lavorazione)

`{{pagination}}` è un helper template driven (con un template associato) che mostra i link ai 'post più recenti' e ai 'post più vecchi' se disponibili, oltre che alla pagina corrente..

Puoi sovrascrivere l'HTML utilizzato dall'helper creando un file <code class="path">pagination.hbs</code> all'interno di <code class="path">content/themes/your-theme/partials</code>.

### <code>body_class</code> <a id="bodyclass-helper"></a>

*   Tipo Helper: output
*   Opzioni: nessuna

`{{body_class}}` – classi da utilizzare nel tag `<body>` all'interno di <code class="path">default.hbs</code>, utile per creare stili specifici per i diversi tipi di pagina.

### <code>post_class</code> <a id="postclass-helper"></a>

*   Tipo Helper: output
*   Options: nessuna

`{{post_class}}` – classi da utilizzare nell'elemento container dei post, utile per creare stili specifici per i diversi post.

### <code>ghost_head</code> <a id="ghosthead-helper"></a>

*   Tipo Helper: output
*   Options: nessuna

`{{ghost_head}}` – da usare appena prima del tag `</head>` in <code class="path">default.hbs</code>, usato per mostrare meta tags, scripts and styles. Potrà essere modificato.

### <code>ghost_foot</code> <a id="ghostfoot-helper"></a>

*   Tipo Helper: output
*   Opzioni: nessuna

`{{ghost_foot}}` – da usare appena prima del tag `</body>` in <code class="path">default.hbs</code>, usato per includere gli scripts. Di default include jquery nella pagina. Potrà essere modificato.

### <code>meta_title</code> <a id="metatitle-helper"></a>

*   Tipo Helper: output
*   Opzioni: nessuna

`{{meta_title}}` – mostra il titolo dei post per i post, o in alternativa il nome del blog. Usato per mostrare il tag title all'interno di `</head>`. Es. `<title>{{meta_title}}</title>`. Potrà essere modificato.

### <code>meta_description</code> <a id="metatitledescription-helper"></a>

*   Tipo Helper: output
*   Opzioni: nessuna

`{{meta_description}}` - al momento non mostra nulla per i post, per ogni altra pagina mostra la descrizione del blog. Usato per mostrare il tag meta description. Es. `<meta name="description" content="{{meta_description}}" />`. Potrà essere modificato.

## Risoluzione dei problemi <a id="troubleshooting"></a>

#### 1. Vedo questo errore: Failed to lookup view "index" or "post"

Controlla che all'interno della cartella del tuo tema siano presenti i file index.hbs and post.hbs.

{% endraw %}
