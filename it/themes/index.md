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

Non è richiesto che default.hbs sia presente, nè che esista alcuna delle cartelle suggerite. <code class="path">index.hbs</code> e <code class="path">post.hbs</code> sono gli unici file richiesti – Ghost non funzionerà senza questi due templates. <code class="path">partials</code> è una cartella speciale. Dovrebbe contenere tutti i templates che hai intenzione di riutilizzare nel tuo tema, per esempio <code class="path">list-post.hbs</code> che potrebbe essere il template di un singolo post in un listing, che quindi riutilizzerai per la homepage, e in futuro per le pagine archivio e tags. <code class="path">partials</code> è anche la cartella che puoi utilizzare per sovrascrivere i templates di default usati da alcuni helpers, come la paginazione. Il file <code class="path">pagination.hbs</code> all'interno di <code class="path">partials</code>ti permetterebbe di personalizzare l'HTML relativo alla paginazione, ad esempio.

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

Create your own Ghost theme by either copying Casper, or adding a new folder to the <code class="path">content/themes</code> directory with the name of your theme, E.g. my-theme (names should be lowercase, and contain letters, numbers and hyphens only). Then add two empty files to your new theme folder: index.hbs and post.hbs. It won't display anything, but this is effectively a valid theme.

### The post list

<code class="path">index.hbs</code> gets handed an object called `posts` which can be used with the foreach helper to output each post. E.g.

```
{{#foreach posts}}
// here we are in the context of a single post
// whatever you put here gets run for each post in posts
{{/foreach}}
```

See the section on the [`{{#foreach}}`](#foreach-helper) helper for more details.

#### Pagination

See the section on the [`{{pagination}}`](#pagination-helper) helper.

### Outputting individual posts

Once you are in the context of a single post, either by looping through the posts list with `foreach` or inside of <code class="path">post.hbs</code> you have access to the properties of a post.

For the time being, these are:

*   id – *post id*
*   title – *post title*
*   url – *the relative URL for a post*
*   content – *post HTML*
*   published_at – *date the post was published*
*   author – *full details of the post author* (see below for more details)

Each of these properties can be output using the standard handlebars expression, e.g. `{{title}}`.

<div class="note">
  <p>
    <strong>Notes:</strong> <ul>
      <li>
        the content property is overridden and output by the <code>{{content}}</code> helper which ensures the HTML is output safely & correctly. See the section on the <a href="#content-helper"><code>{{content}}</code> helper</a> for more info.
      </li>
      <li>
        the url property provided by the <code>{{url}}</code> helper. See the section on the <a href="#url-helper"><code>{{url}}</code> helper</a> for more info.
      </li>
    </ul>
  </p>
</div>

#### Post author

When inside the context of a single post, the following author data is available:

*   `{{author.name}}` – the name of the author 
*   `{{author.email}}` – the author's email address
*   `{{author.bio}}` – the author's bio
*   `{{author.website}}` – the author's website
*   `{{author.image}}` – the author's profile image
*   `{{author.cover}}` – the author's cover image

You can use just`{{author}}` to output the author's name.

This can also be done by using a block expression:

```
{{#author}}
    <a href="mailto:{{email}}">Email {{name}}</a>
{{/author}}
```

#### Post Tags

When inside the context of a single post, the following tag data is available

*   `{{tag.name}}` – the name of the tag 

You can use `{{tags}}` to output a comma separated list of tags, or if you prefer, specify your own separator `{{tags separator=""}}`

This can also be done by using a block expression:

```
<ul>
    {{#tags}}
        <li>{{name}}</li>
    {{/tags}}
</ul>
```

### Global Settings

Ghost themes have access to a number of global settings via the `@blog` global data accessor.

*   `{{@blog.url}}` – the url specified for this env in <code class="path">config.js</code>
*   `{{@blog.title}}` – the blog title from the settings page
*   `{{@blog.description}}` – the blog description from the settings page
*   `{{@blog.logo}}` – the blog logo from the settings page

## Built-in Helpers <a id="helpers"></a>

Ghost has a number of built in helpers which give you the tools you need to build your theme. Helpers are classified into two types: block and output helpers.

**[Block Helpers](http://handlebarsjs.com/block_helpers.html)** have a start and end tag E.g. `{{#foreach}}{{/foreach}}`. The context between the tags changes and these helpers may also provide you with additional properties which you can access with the `@` symbol.

**Output Helpers** look much the same as the expressions used for outputting data e.g. `{{content}}`. They perform useful operations on the data before outputting it, and often provide you with options for how to format the data. Some output helpers use templates to format the data with HTML a bit like partials. Some output helpers are also block helpers, providing a variation of their functionality.

### <code>foreach</code> <a id="foreach-helper"></a>

*   Helper type: block
*   Options: `columns` (number)

`{{#foreach}}` is a special loop helper designed for working with lists of posts. By default the each helper in handlebars adds the private properties `@index` for arrays and `@key` for objects, which can be used inside the each loop.

`foreach` extends this and adds the additional private properties of `@first`, `@last`, `@even`, `@odd`, `@rowStart` and `@rowEnd` to both arrays and objects. This can be used to produce more complex layouts for post lists and other content. For examples see below:

#### `@first` & `@last`

The following example checks through an array or object e.g `posts` and tests for the first entry.

```
{{#foreach posts}}
    {{#if @first}}
        <div>First post</div>
    {{/if}}
{{/foreach}}
```

We can also nest `if` statements to check multiple properties. In this example we are able to output the first and last post separately to other posts.

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

The following example adds a class of even or odd, which could be used for zebra striping content:

```
{{#foreach posts}}
        <div class="{{#if @even}}even{{else}}odd{{/if}}">{{title}}</div>
{{/foreach}}
```

#### `@rowStart` & `@rowEnd`

The following example shows you how to pass in a column argument so that you can set properties for the first and last element in a row. This allows for outputting content in a grid layout.

```
{{#foreach posts columns=3}}
    <li class="{{#if @rowStart}}first{{/if}}{{#if @rowEnd}}last{{/if}}">{{title}}</li>
{{/foreach}}
```

### <code>content</code> <a id="content-helper"></a>

*   Helper type: output
*   Options: `words` (number), `characters` (number) [defaults to show all]

`{{content}}` is a very simple helper used for outputting post content. It makes sure that your HTML gets output correctly.

You can limit the amount of HTML content to output by passing one of the options:

`{{content words="100"}}` will output just 100 words of HTML with correctly matched tags.

### <code>excerpt</code> <a id="excerpt-helper"></a>

*   Helper type: output
*   Options: `words` (number), `characters` (number) [defaults to 50 words]

`{{excerpt}}` outputs content but strips all HTML. This is useful for creating excerpts of posts.

You can limit the amount of text to output by passing one of the options:

`{{excerpt characters="140"}}` will output 140 characters of text.

### <code>date</code> <a id="date-helper"></a>

*   Helper type: output
*   Options: `format` (date format, default “MMM Do, YYYY”), `timeago` (boolean)

`{{date}}` is a formatting helper for outputting dates in various format. You can either pass it a date and a format string to be used to output the date like so:

```
// outputs something like 'July 11, 2013'
{{date published_at format="MMMM DD, YYYY"}}
```

Or you can pass it a date and the timeago flag:

```
// outputs something like '5 mins ago'
{{date published_at timeago="true"}}
```

If you call `{{date}}` without a format, it will default to “MMM Do, YYYY”.

If you call `{{date}}` in the context of a post without telling it which date to display, it will default to `published_at`.

If you call `{{date}}` outside the context of a post without telling it which date to display, it will default to the current date.

`date` uses [moment.js](http://momentjs.com/) for formatting dates. See their [documentation](http://momentjs.com/docs/#/parsing/string-format/) for a full explanation of all the different format strings that can be used.

### <code>url</code> <a id="url-helper"></a>

*   Helper type: output
*   Options: `absolute`

`{{url}}` outputs the relative url for a post when inside the post context. Outside of the post context it will output nothing

You can force the url helper to output an absolute url by using the absolute option, E.g. `{{url absolute="true"}}`

###  <code>pagination</code> <a href="pagination-helper"></a>

*   Helper type: output, template-driven
*   Options: none (coming soon)

`{{pagination}}` is a template driven helper which outputs HTML for 'newer posts' and 'older posts' links if they are available and also says which page you are on.

You can override the HTML output by the pagination helper by placing a file called <code class="path">pagination.hbs</code> inside of <code class="path">content/themes/your-theme/partials</code>.

### <code>body_class</code> <a id="bodyclass-helper"></a>

*   Helper type: output
*   Options: none

`{{body_class}}` – outputs classes intended for the `<body>` tag in <code class="path">default.hbs</code>, useful for targeting specific pages with styles.

### <code>post_class</code> <a id="postclass-helper"></a>

*   Helper type: output
*   Options: none

`{{post_class}}` – outputs classes intended your post container, useful for targeting posts with styles.

### <code>ghost_head</code> <a id="ghosthead-helper"></a>

*   Helper type: output
*   Options: none

`{{ghost_head}}` – belongs just before the `</head>` tag in <code class="path">default.hbs</code>, used for outputting meta tags, scripts and styles. Will be hookable.

### <code>ghost_foot</code> <a id="ghostfoot-helper"></a>

*   Helper type: output
*   Options: none

`{{ghost_foot}}` – belongs just before the `</body>` tag in <code class="path">default.hbs</code>, used for outputting scripts. Outputs jquery by default. Will be hookable.

### <code>meta_title</code> <a id="metatitle-helper"></a>

*   Helper type: output
*   Options: none

`{{meta_title}}` – outputs the post title on posts, or otherwise the blog title. Used for outputting title tags in the `</head>` block. E.g. `<title>{{meta_title}}</title>`. Will be hookable.

### <code>meta_description</code> <a id="metatitledescription-helper"></a>

*   Helper type: output
*   Options: none

`{{meta_description}}` - outputs nothing (yet) on posts, outputs the blog description on all other pages. Used for outputing the description meta tag. E.g. `<meta name="description" content="{{meta_description}}" />`. Will be hookable.

## Troubleshooting Themes <a id="troubleshooting"></a>

#### 1. I see Error: Failed to lookup view "index" or "post"

Check that your theme folder contains a correctly named index.hbs and post.hbs as these are required

{% endraw %}