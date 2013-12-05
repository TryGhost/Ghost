---
lang: it
layout: themes
meta_title: Come realizzare temi in Ghost - Documentazione Ghost
meta_description: Una guida approfondita per realizzare temi per la piattaforma di blog Ghost. Tutto ciò che ti serve per costruire il tuo tema in Ghost.
heading: Ghost Themes
subheading: Inizia a creare il tuo tema in Ghost
chapter: themes
---

{% raw %}

## Cambiare Tema <a id="switching-theme"></a>

I temi di Ghost si trovano nella cartella <code class="path">content/themes/</code>.

Se vuoi usare un tema dfferente da quello di default Casper, prova i temi personalizzati sul nostro [marketplace gallery](http://marketplace.ghost.org/). Scarica il pacchetto del tema scelto, estrailo nella stessa cartella <code class="path">content/themes</code> di Casper.

Se vuoi realizzare un tuto tema, ti raccomandiamo di copiare e rinomiare la cartella di Casper ed editare il template come più ti aggrado.

Per utilizzare il tuo nuovo tema:

1. Riavvia Ghost. Al momento, Ghost non notifica che è stata aggiunta una nuova cartella in <code class="path">content/themes</code> quindi dovrai riavviarlo.
2. Autenticati al pannello di amministrazione di Ghost, e accedi a <code class="path">/ghost/settings/general/</code>.
3. Seleziona il nome del tuo tema nel menu a tendina 'Theme'.
4.  Clicca su 'Save'
5.  Accedi al frontend del tuo blog e goditi il tuo nuovo tema.


##  Che cosa sono gli Handlebars? <a id="what-is-handlebars"></a>

[Handlebars](http://handlebarsjs.com/) è il linguaggio usato da Ghost, per realizzare i temi.

> Handlebars fornisce l'energia necessaria per costruire temi senza frustazione.

Se stai iniziando a scrivere il tuo tema, prima probabilmente devi famigliarizzare con la sintassi degli handlebars.  Leggi questa[documentazione degli handlebars](http://handlebarsjs.com/expressions.html), o controlla questo [tutorial di Treehouse](http://blog.teamtreehouse.com/getting-started-with-handlebars-js) – puoi saltare la prima sezione, dedicata all'installazione ed uso (ne abbiamo già un bel pò) e comincia con ‘Basic Expressions’.

## Info temi Ghost <a id="about"></a>

I temi in ghost sono realizzati per essere semplici da realizzare e da mantenere. Sono caratterizzati da un distacco netto tra templates (HTML) e qualunque logica business(JavaScript). Handlebars è (quasi) privo di logica e rimarca questo distacco, fornendo supporto alla logica di busness per visualizzare il contenuto rimanendo distaccata ed autosufficiente. Questo distacco

Ghost themes are intended to be simple to build and maintain. They advocate strong separation between templates (the HTML) and any business logic (JavaScript). Handlebars is (almost) logicless and enforces this separation, providing the helper mechanism so that business logic for displaying content remains separate and self-contained. Questa separazione facilita la collaborazione tra sviluppatori e designer per realizzare temi.

Le handlebars dei template sono dotate di gerarchia (un solo template può estendere un altro), e supportare template parziali. Ghost utilizza questa caratteristiche per ridurre la duplicazione di codice e centrare l'attenzione su un singolo scopo, e farlo al meglio. Un tema ben strutturato sarà più facile da mantenere e tenere i componenti separati, permette di riutilizzarli più facilmente tra più temi.

Speriamo che accetterai il nostro approccio per realizzare i temi.

## Struttura file in un tema di Ghost <a id="file-structure"></a>

La struttura dei file raccomanda è:

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
Per il momento non ci sono richieste per default.hbs o l'esistenza di qualunque cartella. <code class="path">index.hbs</code> e <code class="path">post.hbs</code> sono richiesti- Ghost non può funzionare se non sono presenti questi due file. <code class="path">partials</code> è una cartella speciale. Questa permette di includere qualunque parte del template che vuoi utilizzare in più parti del tuo blog, per esempio <code class="path">list-post.hbs</code> potrebbe includere il modello per visualizzare un singolo articolo in una lista, a sua volta potrebbe essere utilizzata nella homepage, e in pagine future di archivio e tag.<code class="path">partials</code>

anche qui puoi mettere i modelli per sovvrascrivere componenti utili come pagination.
Includere un file <code class="path">pagination.hbs</code> all'interno  <code class="path">partials</code> ti permetterà di specificare la tua struttura HTML per l'impaginazione.

### default.hbs

Questa è la base del template che conterrà tutto il codice HTML che dovrà apparire in ogni pagina - il tag `<html>`, `<head>` e `<body>` affiancati ai  `{{ghost_head}}` e `{{ghost_foot}}` , nonché qualunque codice HTML che deve ripetersi in ogni pagina del blog.


Il modello di default contiene l'espressione handlebars `{{{body}}}` per indicare dove andrà il contenuto dei modelli che lo estendono.

Le pagine del template devo avere `{{!< default}}` alla prima riga per specificare che estendono il template di default, e che il loro contenuto deve essere inserito in default.hbs dove è definito `{{{body}}}`.

### index.hbs


Questo è il modello per l'homepage, ed estende  <code class="path">default.hbs</code>. L'homepage riceve una lista di articoli da visualizzare e <code class="path">index.hbs</code> definisce come ognugno di questi debba essere visualizzato.

In Casper (il tema di default), l'homepage ha un header larco che utilizza l'impostazione globale `@blog` per mostrare il logo del blog, titolo e descrizione. 
Segue `{{#foreach}}` per mostrare la lista degli ultimi articoli.

### post.hbs

Questo è il modello per un singolo articolo, ed anche questo estende <code class="path">default.hbs</code>.

In Casper (il template di base), il modello del singolo articolo ha una propria intestazione: usa ancora `@blog`, impostazione globale, ed utilizza `{{#post}}` per accedere ai dati e visualizzare tutto l'articolo, dettagli compresi.

### Articolo anteprima e modelli
Quando realizzi il tema per Ghost, considera lo scopo delle tue classi, e in particolare il tuo ID, per provare ad evitare conflitti tra il modello per tua versione di base e quello per l'articolo. Non devi conoscere quando una classe o un particolare ID (per la generazione automatica di ID per intestazioni) che utilizzi nell'articolo. Pertanto è lo scopo migliore di pensare ad un particolare della pagina. E.s.#mio-id potrebbe corrispondere a qualcosa che non ti aspetti, quindi è meglio utilizzare #nometema-mio-id.

Ghost mira ad offrire un'anteprima reale del tuo articolo, con una parte dello schermo dell'editor, ma per fare questo, dobbiamo caricare un tema personalizzato per l'articolo nel pannello amministrazione. Quest caratteristica non è ancora implementata, ma raccomandiamo caldamente di separare in unf ile specifico lo stile dell'articolo (post.css) dagli altri stili adottati dal tuo template (style.css); un vantaggio per il futuro.

## Crea il tuo tema <a id="create-your-own"></a>

Creare il tuo tema in Ghost da una copia di Casper, o aggiungi una cartella in <code class="path">content/themes</code>, rinominata con il nome del tuo tema, Es il-mio-tema (i nomi devono esser scritti in minuscolo, e contenere solamente lettere, numeri e trattini).

Quindi aggiungi due file vuoti alla cartella del tuo tema: index.hbs e post.hbs. Non potrai visualizzare nulla ma effettivamente il tema funziona.

### La lista articoli

<code class="path">index.hbs</code> gestisce un oggetto chiamato `posts` che può essere usato con la struttura foreach, per visualizzare ogni articolo. E.s.
```
{{#foreach posts}}
// here we are in the context of a single post
// whatever you put here gets run for each post in posts
{{/foreach}}
```
Vedi la sezione dedicata alla struttura [`{{#foreach}}`](#foreach-helper) per maggiori dettagli.

#### Paginazione

Vedi la sezione [`{{pagination}}`](#pagination-helper).

### Visualizzare articoli, singolarmente

Una volta che stai gestendo un singolo articolo, oppure all'interno della struttura `foreach` per ogni elemento, oppure all'interno or inside of <code class="path">post.hbs</code> hai accesso alle proprietà dell'articolo.

Per i primi tempi, sono queste:

*   id – *id articolo*
*   title – *titolo articolo*
*   url – *URL relativo, non assoluto, dell'articolo*
*   content – *codice HTML dell'articolo*
*   published_at – *Data di pubblicazione dell'articolo*
*   author – *Tutte le informazioni dell'autore dell'articolo* ( vedi oltre per altri dettagli)

Ognuna di queste proprietà può essere utilizata con l'espressione standard degli handlebars, e.s.`{{title}}`.

<div class="note">
  <p>
    <strong>Note:</strong> <ul>
      <li>Le proprietà del contenuto sono sovvrascritte  e visualizzate dalla struttura <code>{{content}}</code> che garantisce l'output HTML sicuro e corretto. Vedi la sezione <a href="#content-helper"><code>{{content}}</code> helper</a> per maggiori informazioni.
      </li>
      <li>
      Le proprietà dell'url sono fornite da <code>{{url}}</code>. Vedi la sezione <a href="#url-helper"><code>{{url}}</code> helper</a> per maggiori informazioni.
      </li>
    </ul>
  </p>
</div>

#### Autore articolo

Quando stai gestendo un singolo articolo, sono disponibili le seguenti proprietà dell'autore:

*   `{{author.name}}` – Nome autore 
*   `{{author.email}}` – Indirizzo email autore
*   `{{author.bio}}` – Biografia dell'autore
*   `{{author.website}}` – Sito web dell'autore
*   `{{author.image}}` – Immagine di profilo dell'autore
*   `{{author.cover}}` – Immagine di copertina dell'autore

Puoi usare solo `{{author}}` per visualizzare il nome. Questo, lo puoi anche fare con questo script:

```
{{#author}}
    <a href="mailto:{{email}}">Email {{name}}</a>
{{/author}}
```

#### Tag articolo

Quando stai gestendo un singolo articolo,sono disponibili queste proprietà per i tag:

*   `{{tag.name}}` – Nome del tag

Puoi usare `{{tags}}` per visualizzare una lista di tag, separati dalla virgola, o se preferisci, specificare il separatore con `{{tags separator=""}}`.

Puoi anche utilizzare questo script:

```
<ul>
    {{#tags}}
        <li>{{name}}</li>
    {{/tags}}
</ul>
```

### Impostazioni Globali

I temi di ghost hanno accesso ad un numero di impostazioni globali, attraverso la struttura `@blog`.

*   `{{@blog.url}}` –  Url specificato in <code class="path">config.js</code>
*   `{{@blog.title}}` – Titolo del blog impostato dal pannello di amministrazione
*   `{{@blog.description}}` – Descrizione del blog impostata dal pannello di amministrazione
*   `{{@blog.logo}}` – Logo del blog impostato dal pannello di amministrazione

## Strutture aggiuntive <a id="helpers"></a>

Ghost ha un numero di strutture ausiliarie, strumenti di cui hai bisogno per costruire il tuo tema. Queste strutture sono di due tipi: block and output.

**[Block](http://handlebarsjs.com/block_helpers.html)** iniziano e finiscono con il tag Es. `{{#foreach}}{{/foreach}}`. Il contenuto tra i due tag cambia e queste strutture possono fornirti proprietà addizionali a cui puoi accedere utilizzando il simbolo `@`.

**Output** molte delle espressioni utilizzate pe visualizzare i dati, come `{{content}}`. Compiono operazioni utili sui dati, prima di visualizzarli e forniscono opzioni per la formattazione delle informazioni.
Qualcuna di queste strutture usa modelli per formattare le informazioni con piccole parti di HTML. Qualcun'altra utilizza strutture block, per fornire una variante della loro funzionalità.

### <code>foreach</code> <a id="foreach-helper"></a>

*   Tipo struttura: block
*   Opzioni: `columns` (number)

`{{#foreach}}` è una speciale struttura ciclante, disegnata per lavorare con le liste di articoli.
Di default, ogni struttura in handlebars aggiunge le proprietà private `@index` per gli array e `@key` per gli oggetti, utilizzabili dentro ogni loop.

`foreach` estende tutto questo aggiungendo delle proprietà private addizionali come `@first`, `@last`, `@even`, `@odd`, `@rowStart` e `@rowEnd` sia per array che per oggetti.

Questo può essere utilizzato per realizzare complessi layout per liste articoli e altri contenuti. Per gli esempi, guarda oltre.

#### `@first` & `@last`

Il seguente esempio controlla l'array o l'object es. `posts` ed effettua un test sul primo elemento.

```
{{#foreach posts}}
    {{#if @first}}
        <div>First post</div>
    {{/if}}
{{/foreach}}
```

Possiamo usare più `if` per controllare più proprietà.
Questo è un esempio in cui visualizzazimo il primo e l'ultimo articolo, separatamente.

```
{{#foreach posts}}
    {{#if @first}}
    <div>First post</div>
    {{else}}
        {{#if @last}}
            <div>Last post</div>
        {{else}}
            <div>All other posts</div>
        {{/if}}
    {{/if}}
{{/foreach}}
```

#### `@even` & `@odd`

Il seguente esempio aggiunge alla classe even o odd, e puoi utilizzarlo per disporre il contenuto  come il manto della zebra:

```
{{#foreach posts}}
        <div class="{{#if @even}}even{{else}}odd{{/if}}">{{title}}</div>
{{/foreach}}
```

#### `@rowStart` & `@rowEnd`

Il seguente esempio ti mostra come mettere gli aromenti in colonna con le proprietà che hai impostato per il primo e l'ultimo elemento della riga. Questo permette di mostrare il contenuto con una griglia.

```
{{#foreach posts columns=3}}
    <li class="{{#if @rowStart}}first{{/if}}{{#if @rowEnd}}last{{/if}}">{{title}}</li>
{{/foreach}}
```

### <code>content</code> <a id="content-helper"></a>

*   Tipo Struttura: output
*   Opzioni: `words` (numero), `characters` (numero) [Di default mostra tutto il contenuto]

`{{content}}` è una struttura molto semplice per mostrare il contenuto di un articolo. Si assicura che l'output scritto in HTML sia corretto.

Puoi limitare il contenuto mostrato in HTML utilizzando una di queste opzioni:

`{{content words="100"}}` mostra solo 100 parole in HTML con la corretta chiusura dei tag.

### <code>excerpt</code> <a id="excerpt-helper"></a>

*   Tipo struttura: output
*   Opzioni: `words` (numeri), `characters` (numeri) [Di default settato per 50 parole]

`{{excerpt}}` mostra ilcontenuto privato di tutto il codice HTML. Molto utile per creare anteprime dei post.

Puoi limitare il testo da mostrare utilizzando una di queste opzioni:

`{{excerpt characters="140"}}` mostrerà solo 140 caratteri di testo.

### <code>date</code> <a id="date-helper"></a>

*   Helper type: output
*   Options: `format` (date format, default “MMM Do, YYYY”), `timeago` (boolean)

`{{date}}` è il formato struttura per visualizzare le date in vari formati. Puoi anche passare una data e la stringa formato da utilizzare per visualizzarla:

```
// outputs something like 'July 11, 2013'
{{date published_at format="MMMM DD, YYYY"}}
```
Oppure puoi passare la data ed attivare il campo timeago:

```
// outputs something like '5 mins ago'
{{date published_at timeago="true"}}
```

Se invochi `{{date}}` senza formato, verrà utilizzato quello di default “MMM Do, YYYY”.

Se utilizzi `{{date}}` nel contenuto dell'articolo senza esplicitare quale data visualizzare, utilizzerà di default `published_at`.

Se invochi  `{{date}}` al di fuori dell'articolo senza indicare quale data mostrare, utilizzerà di default la data corrente.

`date` usa [moment.js](http://momentjs.com/) per il formato. Vedi la loro [documentazione](http://momentjs.com/docs/#/parsing/string-format/) per una spiegazione di tutti i different formati che puoi usare.

### <code>url</code> <a id="url-helper"></a>

*   Tipo struttura: output
*   Opzioni: `absolute`

`{{url}}`  visualizza il relativo url per l'articolo quando sei all'interno del contenuto dell'articolo stesso. Al di fuori del contesto articolo, non visualizzerà nulla.

Se vuoi forzare la struttura url per visualizzare l'indirizzo assoluto, abilita l'opzione absolute, Es. `{{url absolute="true"}}`

###  <code>pagination</code> <a href="pagination-helper"></a>

*   Tipo struttura: output, template-driven
*   Opzioni: none (prossimamente)

`{{pagination}}` è un modello che formatta il codice HTML per i link 'articioli recenti' e 'articoli precedenti', se sono disponibili, ed indica in quale pagina ti trovi.

Puoi sovvrascrivere il codice HTML in uscita, con la struttura pagination, utilizzando il file <code class="path">pagination.hbs</code> all'interno di <code class="path">content/themes/your-theme/partials</code>.

### <code>body_class</code> <a id="bodyclass-helper"></a>

*   Tipo struttura: output
*   Opzioni: none

`{{body_class}}` – classe per visualizzare il contenuto del tag `<body>` in <code class="path">default.hbs</code>, utile per selezionare stili in pagine specifiche.

### <code>post_class</code> <a id="postclass-helper"></a>

*   Tipo struttura: output
*   Opzioni: none

`{{post_class}}` – inserisce la classe destinata a contenere il tuo articolo, utile per selezionare uno stile particolare per i tuoi articoli.

### <code>ghost_head</code> <a id="ghosthead-helper"></a>

*   Tipo strutturae: output
*   Opzioni: none

`{{ghost_head}}` – si trova giusto primo del tag `</head>` in <code class="path">default.hbs</code>, utilizzato per mostrare il contenuto dei meta tag, script e fogli di stile. Sarà aggiunto prossimamente.

### <code>ghost_foot</code> <a id="ghostfoot-helper"></a>

*   Tipo struttura: output
*   Opzioni: none

`{{ghost_foot}}` – si trova esattamente prima del tag `</body>` in <code class="path">default.hbs</code>, utilizzato per mostrare il rsiultato degli script. Di solito è ideale per script di jquery. Sarà aggiunto prossimamente.

### <code>meta_title</code> <a id="metatitle-helper"></a>

*   Tipo struttura: output
*   Opzioni: none

`{{meta_title}}` – mostra il titolo dell'articolo, o altrimenti il titolo del blog. Utilizzato per mostrare il tag title, all'interno del blocco `</head>`. Es. `<title>{{meta_title}}</title>`. Sarà aggiunto prossimamente.

### <code>meta_description</code> <a id="metatitledescription-helper"></a>

*   Tipo struttura: output
*   Opzioni: none

`{{meta_description}}` - non mostra nulla (per ancora) dell'articolo, invece in tutte le pagine mostra la descrizione del blog. Utilizzato per visualizzare il contenuto del meta tag description. Es. `<meta name="description" content="{{meta_description}}" />`. Sarà aggiunto prossimamente.

## Problemi e soluzioni temi <a id="troubleshooting"></a>

#### 1. Io vedo Error: Failed to lookup view "index" or "post"

Controlla che la cartella del tuo tema, abbia i file richiesti index.hbs e post.hbs (esattamente cos', in minuscolo e senza spazi).

{% endraw %}
