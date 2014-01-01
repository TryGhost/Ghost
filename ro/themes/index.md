---
lang: ro
layout: themes
meta_title: How to Make Ghost Themes - Ghost Docs
meta_description: An in depth guide to making themes for the Ghost blogging platform. Everything you need to know to build themes for Ghost.
heading: Ghost Themes
subheading: Get started creating your own themes for Ghost
chapter: themes
---

{% raw %}

## Cum să schimbi tema <a id="switching-theme"></a>

Temele Ghost sunt în <code class="path">content/themes/</code>.

Dacă vrei să folosești o altă temă decât Casper, uită-te la temele oferite de [magazinul nostru](http://marketplace.ghost.org/). Descarcă tema pe care o vrei, dezarhiveaz-o și mută folderul în <code class="path">content/themes/</code>, lângă Casper.
Dacă vrei să îți placi propria tema, vă recomandăm să copiați și redenumiți casper și să editați tema pentru a o face să arate așa cum vă doriți.

Pentru a aplica tema nouă:

1.  Restartează Ghost. În prezent Ghost nu detectează schimbările din <code class="path">content/themes/</code>
2.  Loghează-te ca administrator și navighează la <code class="path">/ghost/settings/general/</code>
4.  Click pe 'Save'
5.  Vizitează pagina principală a blogului pentru a vedea schimbarea


##  Ce este Handlebars? <a id="what-is-handlebars"></a>

[Handlebars](http://handlebarsjs.com/) este limba de teme folosită de Ghost.

> Handlebars oferă puterea necesară pentru a scrie o temă semantică ușor, fără frustrări.

Dacă vrei să scrii propria temă va trebui să înveți sintaxa Handlebars. Citește [documentația](http://handlebarsjs.com/expressions.html) sau acest [tutorial de la Treehouse](http://blog.teamtreehouse.com/getting-started-with-handlebars-js) - poți sări peste prima secțiune despre utilizare și să sari la  `Basic Expressions`

## Despre temele Ghost <a id="about"></a>

Temele Ghost sunt făcute să fie simplu de construit și întreținut. Promovează separarea cât mai clară dintre temă(HTMLul) și logica programului(Javascript). Handlebars nu include logică și necesită această separare oferindu-ți un mecanism pentru ca logica afișării conținutului să rămână separată. Această separare facilitează colaborarea între designerii și programatorii care se ocupa cu așa ceva.

Temele Handlebars sunt ierarhice (o temă o poate extinde pe alta) și suportă teme parțiale. Ghost folosește aceste opțiuni pentru a reduce duplicare codului și pentru a ține temele concentrate pe a face un singur lucru. O temă structurată bine va fi ușor de întreținut și ținut componentele separate, astfel încât să le poți refolosi într-o temă.

Sperăm să vă placă modul în care am decis să abordăm problema.

## Structura fișierelor unei teme Ghost <a id="file-structure"></a>

Structura recomandată:

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

Deocamdată nu este obligatoriu ca default.hbs sau orice alt folder să existe. <code class="path">index.hbs</code> și <code class="path">post.hbs</code> sunt necesare - Ghost nu va merge dacă aceste două fișiere nu sunt prezente. <code class="path">partials</code> este un director special. Trebuie să includă orice părți de teme pe care vrei să le folosești în blog; de exemplu <code class="path">list-post.hbs</code> poate include o temă pentru a printa un articol într-o listă, structură care poate fi folosită pe prima pagină, și în viitor pentru paginile de arhivă și taguri. <code class="path">partials</code> este deasemenea locul unde poți pune teme care să suprascrie pe cele încorporate, folosite de programe ajutătoare cum ar fi cel de paginare. Dacă incluzi <code class="path">pagination.hbs</code> în <code class="path">partials</code>, atunci vei putea să îți creezi propriul cod pentru paginare.

### default.hbs

Acesta este fișierul de bază, care conține toate părțile plictisitoare de HTML care vor apărea pe toate paginile - tagurile `<html>`, `<head>` și `<body>`, precum și `{{ghost_head}}` și `{{ghost_foot}}` și toate elementele HTML care reprezintă un header sau footer ce se repetă pe blog.

Fișierul cu structura de bază, conține expresia handlebars `{{{body}}}` pentru a denota unde să insereze conținutul din temele ce o extind pe cea predefinită.

Temele au `{{!< default}}` ca primă linie pentru a specifica faptul că extind altă temă și conținutul trebuie plasat în <code class="path">code.hbs</code> unde `{{{body}}}` este definit.

### index.hbs

Acest fișier definește structura paginii principale și extinde <code class="path">default.hbs</code>. Paginii principale îi este pasată o listă de articole și <code class="path">index.hbs</code> definește cum fiecare post trebuie afișat.

În Casper (în prezent tema predefinită), pagina principală are un header mare care folosește variabila `@blog` pentru a produce logoul blogului și descrierea. Acesta este urmat de modulul ajutător {{#foreach}}` pentru a produce o listă a celor mai recente articole.

### post.hbs

Acest fișier conține structura unui singur articol, și extinde de asemenea <code class="path">default.hbs</code>.

În Casper (în prezent tema predefinită), acest fișier are propriul header și folosește variabila globala `@blog` și accesorul de date `{{#post}}` pentru a afișa conținutul.

### Editarea și previzualizarea articolelor

Când construiți teme pentru Ghost, aveți grijă la domeniul claselor, în special la IDuri, și evitați coliziunile dintre stilul principal și stilul articolului. Nu veți știi ce nume vor avea o clasă sau un ID la afișarea unui articol, de aceea e cel mai sigur să alegeți domeniul potrivit pentru fiecare parte a paginii. De exemplu: #my-id poate avea același nume cu variabile necunoscute de voie, lucru ușor de evitat cu un nume ca #themename-my-id.

Ghost oferă o previzualizare realistică a articolului ca pare din editorul împărțit în două, dar pentru a face asta trebuie să încărcăm stilul specific al unui post. Această funcție nu este încă implementată, dar îți recomandăm să țineți stilul pentru articole într-un fișier separat(post.css) pentru a putea face viitoarele modificări necesare mai ușor.

## Crează-ți propria temă <a id="create-your-own"></a>

Îți poți creea propria temă pentru Ghost copiind Casper sau adăugând un nou director cu numele temei în <code class="path">content/themes</code>. Numele trebuie să fie în minuscule și să conțină doar litere, numere și cratime. Adaugă două fișiere goale în noul director: index.hbs și post.hbs. Nu vor afișa nimic, dar vor genera o tema validă.

### Lista de articole

<code class="path">index.hbs</code> primește un obiect numit `posts` care poate fi folosit cu modulul <code>foreach</code> pentru a afișa fiecare articol. De ex.:
```
{{#foreach posts}}
// Aici ești în contextul unui articol
// Tot ce pui aici va fi executat pentru fiecare articol din listă.
{{/foreach}}
```

Vezi secțiunea despre modulul [`{{#foreach}}`](#foreach-helper) pentru mai multe detalii.

#### Paginarea

Vezi secțiunea despre modulul [`{{pagination}}`](#pagination-helper).

### Afișarea unui singur articol

Odată ce sunteți în contextul unui singur articol, folosind `foreach` sau într-un <code class="path">post.hbs</code>, ai acces la toate proprietățiile unui articol.

În prezent, acestea sunt:

*   id – *IDul articolului*
*   title – *Titlul articolului*
*   url – *URLul relativ al unui articol*
*   content – *HTMLul articolului*
*   published_at – *Data când articolul a fost publicat*
*   author – *Detaliile despre autor* (vezi mai jos pentru mai multe detalii)

Each of these properties can be output using the standard handlebars expression, e.g. `{{title}}`.
Toate aceste proprietăți pot fi accesate folosind expresiile standard handlebars. De ex.: `{{title}}`

<div class="note">
  <p>
    <strong>Note:</strong> <ul>
      <li>
        Proprietatea <code>content</code> este suprascrisă și afișată de modulul <code>{{content}}</code> care se asigură că HTMLul este produs și transmis corect și în siguranță. Vezi secțiunea despre <a href="#content-helper">modulul <code>{{content}}</code></a> pentru mai multe informații.
      </li>
      <li>
        Proprietatea <code>url</code> provine din modulul <code>{{url}}</code>. Vezi secțiunea despre <a href="#url-helper">modulul <code>{{url}}</code></a> pentru mai multe informații.
      </li>
    </ul>
  </p>
</div>

#### Autorul unui articol

Când sunteți în contextul unui singur articol ai acces la următoarele informații despre autor:

*   `{{author.name}}` – Numele autorului
*   `{{author.email}}` – Adresa de email a autorului
*   `{{author.bio}}` – Bioul autorului
*   `{{author.website}}` – Site-ul autorului
*   `{{author.image}}` – Imaginea de profil a autorului
*   `{{author.cover}}` – Imaginea de fundal a autorului

Poți folosi `{{author}}` pentru a afișa doar numele autorului.

Poți face asta și printr-o expresie bloc:

```
{{#author}}
    <a href="mailto:{{email}}">Email {{name}}</a>
{{/author}}
```

#### Tagurile articolelor

Când sunteți în contextul unui singur articol, următoarele proprietăți ale tagurilor sunt disponibile:

*   `{{tag.name}}` – Numele tagului

Poți folosi `{{tags}}` pentru a produce o listă separată de o virgulă, sau dacă preferi, un separator ales de tine cu `{{tags separator=""}}`

Poți face asta și printr-o expresie bloc:

```
<ul>
    {{#tags}}
        <li>{{name}}</li>
    {{/tags}}
</ul>
```

### Setări globale

Ghost themes have access to a number of global settings via the `@blog` global data accessor.
Temele Ghost au acces la un număr de variabile globale prin accesorul global `@blog`

*   `{{@blog.url}}` – URLul specificat de mediu <code class="path">config.js</code>
*   `{{@blog.title}}` – Titlul blogului setat pe pagina de setări
*   `{{@blog.description}}` – Descrierea blogului setat pe pagina de setari
*   `{{@blog.logo}}` – Logoul blogului setat pe pagina de setări

## Module Predefinite <a id="helpers"></a>

Ghost are un număr de module care îți dau uneltele necesare să îți construiești propria temă. Modulele sunt clasificate în două tipuri: blocuri și module de afișare.

**[Modulele bloc(block helpers)](http://handlebarsjs.com/block_helpers.html)** au un tag de inceput și sfârșit. De ex.: `{{#foreach}}{{/foreach}}`. Contextul intre taguri se schimbă și aceste module îți pot oferi proprietăți adiționale pe care le poți accesa cu simbolul `@`.

**Modulele de afișare(Output helpers)** arată aproape la fel ca expresiile folosite pentru returnarea informațiilor. De ex.: `{{content}}`. Efectuează operații folositoare pe bucățiile de informație transmise și deseori oferă opțiuni pentru formatarea acestora. Unele module folosesc teme pentru formatarea informației, similar cu parțialele. Unele module de afișare sunt și module bloc, oferind o variație a funcționalității lor.

### <code>foreach</code> <a id="foreach-helper"></a>

*   Tipul modulului: bloc
*   Opțiuni: `columns` (număr)

`{{#foreach}}` este o buclă special construită pentru a lucra cu liste de articole. Toate modulele din handlebars adaugă două proprietăți contextului curent: `@index` pentru vectori și `@key` pentru obiecte, ambele disponibile înăuntrul buclei <code>each</code>

`foreach` extinde această buclă și adaugă mai multe proprietăți private: `@first`, `@last`, `@even`, `@odd`, `@rowStart` și `@rowEnd` atât vectorilor cât și obiectelor. Această buclă poate fi folosită pentru a produce scheme complexe pentru liste de posturi sau alt conținut. Pentru exemple, vezi mai jos:

#### `@first` & `@last`

Exemplul iterează printr-un vector sau obiect și testează dacă se află la prima intrare.

```
{{#foreach posts}}
    {{#if @first}}
        <div>First post</div>
    {{/if}}
{{/foreach}}
```

Instrucțiunile `if` pot verifica proprietăți multiple prin imbricare. În acest exemplu putem să modificăm modul în care primul și ultimul articol este procesat.

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

Următorul exemplu adaugă o clasă, even(par) sau odd(impar) ce poate fi folosită pentru alternarea culorilor într-o listă:

```
{{#foreach posts}}
        <div class="{{#if @even}}even{{else}}odd{{/if}}">{{title}}</div>
{{/foreach}}
```

#### `@rowStart` & `@rowEnd`

Exemplul următor demonstrează cum să pasezi un argument într-o coloană pentru a putea seta proprietăți pentru primul și ultimul element dintr-un rând. Asta îți permite să afișezi conținut într-un grid. 

```
{{#foreach posts columns=3}}
    <li class="{{#if @rowStart}}first{{/if}}{{#if @rowEnd}}last{{/if}}">{{title}}</li>
{{/foreach}}
```

### <code>content</code> <a id="content-helper"></a>

*   Tipul modulului: afișare
*   Tipul modulului: afișare
*   Opțiuni: `words` (număr), `characters` (număr)

`{{content}}` este un modul simplu folosit pentru afișarea conținutului articolelor. Verifică dacă HTMLul este produs corect.

Poți limita cât HTML să fie produs pasându-i una din opțiuni:

`{{content words="100"}}` va produce 100 de cuvinte HTML cu taguri împerecheate.

### <code>excerpt</code> <a id="excerpt-helper"></a>

*   Tipul modulului: output
*   Opțiuni: `words` (number), `characters` (number) [defaults to 50 words]

`{{excerpt}}` outputs content but strips all HTML. This is useful for creating excerpts of posts.

You can limit the amount of text to output by passing one of the options:

`{{excerpt characters="140"}}` will output 140 characters of text.

### <code>date</code> <a id="date-helper"></a>

*   Tipul modulului output
*   Opțiuni: `format` (formatul dateu, predefinit “MMM Do, YYYY”), `timeago` (boolean)

`{{date}}` este un modul pentru afișarea datei calendaristice în diverse formaturi. Îi poți pasa o dată și un string de formatare pentru a fi folosit la afișare:

```
// Produce: 'July 11, 2013'
{{date published_at format="MMMM DD, YYYY"}}
```

Sau îi poți pasa o dată și opțiunea timeago:

```
// Produce: '5 mins ago'
{{date published_at timeago="true"}}
```

Dacă invoci `{{date}}` fără un format, va folosi formatul predefinit “MMM Do, YYYY”.

Dacă invoci `{{date}}` în contextul unui articol fără să îi spui ce dată să afișeze, va folosi variabila `published_at`.

Dacă invoci `{{date}}` în afara contextului unui articol fără să specifici ce dată să afișeze va afișa data curentă.

`date` folosește [moment.js](http://momentjs.com/) pentru a formata datele. Vezi [documentația](http://momentjs.com/docs/#/parsing/string-format/) pentru o explicație pe larg a diferitelor stringuri de formatare ce pot fi folosite.

### <code>url</code> <a id="url-helper"></a>

*   Tipul modulului: afișare
*   Opțiuni: `absolute`

`{{url}}` afișează URLul relativ al unui articol atunci când vă aflați în interiorul contextului potrivit. În afara contextului articolului, nu va produce nimic.

Poți forța modulul să afișeze un URL absolut invocându-l în felul următor: `{{url absolute="true"}}`.

###  <code>pagination</code> <a href="pagination-helper"></a>

*   Tipul modulului: output, template-driven
*   Opțiuni: none (în curând)

`{{pagination}}` este un modul bazat pe un sistem de scheme ce produce HTML pentru ancorele 'Articole mai noi' și 'Articole mai vechi', dacă sunt disponibile.

Poți suprascrie HTMLul produs de acest modul plasând un fișier numit <code class="path">pagination.hbs</code> în folderul <code class="path">content/themes/your-theme/partials</code>.

### <code>body_class</code> <a id="bodyclass-helper"></a>

*   Tipul modulului: output
*   Opțiuni: none

`{{body_class}}` - produce clasele pentru tagul `<body>` în <code class="path">default.hbs</code>, folositor pentru targetarea unor pagini specifice cu stiluri.

### <code>post_class</code> <a id="postclass-helper"></a>

*   Tipul modulului: output
*   Opțiuni: none

`{{post_class}}` - produce clase pentru containerul unui articol, folositor pentru targetarea articolelor cu diferite stiluri.

### <code>ghost_head</code> <a id="ghosthead-helper"></a>

*   Tipul modulului: output
*   Opțiuni: none

`{{ghost_head}}` - apare înainte de tagul `</head>` în <code class="path">default.hbs</code>, folosit pentru producerea meta tagurilor, scripturilor și stilurilor.

### <code>ghost_foot</code> <a id="ghostfoot-helper"></a>

*   Tipul modulului: output
*   Opțiuni: none

`{{ghost_foot}}` - apare înainte de tagul `</body>`în <code class="path">default.hbs</code>, folosit pentru producerea scripturilor. Produce jquery dacă nu este modificat.

### <code>meta_title</code> <a id="metatitle-helper"></a>

*   Tipul modulului: output
*   Opțiuni: none

`{{meta_title}}` - produce titlul articolelor sau titlul blogului, în funcție de context. Folosit pentru producerea tagurilor de titlu înainte de blocul `<head>`.

### <code>meta_description</code> <a id="metatitledescription-helper"></a>

*   Tipul modulului: output
*   Opțiuni: none

`{{meta_description}}` - încă nu produce nimic pentru articole, produce descrierea blogului pe celelalte pagini. Folosit pentru producerea meta tagurilor.

## Depanarea Temelor <a id="troubleshooting"></a>

#### 1. Văd eroarea: Failed to lookup view "index" or "post"

Verifică dacă ai fișierele index.hbs și post.hbs în folderul temei.

{% endraw %}
