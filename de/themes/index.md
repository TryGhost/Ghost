---
lang: de
layout: themes
meta_title: Wie man Ghost-Themes erstellt - Ghost-Docs
meta_description: Eine detaillierte Anleitung zur Erstellung von Themes für die Ghost-Bloggingplattform. Alles, was Du wissen musst, um Themes für Ghost zu erstellen.
heading: Ghost-Themes
subheading: Leg los mit Deinen eigenen Themes für Ghost
chapter: themes
---

{% raw %}

## Theme wechseln <a id="switching-theme"></a>

Du findest Ghost-Themes in <code class="path">content/themes/</code>

Wenn Du ein anderes Theme als das Standard-Theme "Casper" verwenden möchtest, wirf einen Blick auf unsere [Marketplace-Galerie](http://marketplace.ghost.org/).
Lade Dir das Theme-Paket Deiner Wahl herunter, entpacke es und verschiebe es nach <code class="path">content/themes</code> neben Casper.

Wenn Du Dein eigenes Theme erstellen möchtest, empfehlen wir Dir, den <code class="path">casper</code>-Ordner zu kopieren und die Templates so anzupassen, dass sie so aussehen und funktionieren, wie Du möchtest.

Um zu Deinem neu erstellten Theme zu wechseln:

1. Starte Ghost neu. Derzeit bemerkt Ghost noch nicht, dass Du ein neues Theme in <code class="path">content/themes</code> hinzugefügt hast, also musst Du Ghost neu starten.
2. Logge Dich in den Admin-Bereich von Ghost ein und navigiere zu <code class="path">/ghost/settings/general/</code>.
3. Wähle Dein Theme im "Theme"-Auswahlfeld.
4. Klicke "Save".
5. Besuche das Frontend Deines Blogs und bestaune Dein neues Theme.

## Was ist Handlebars? <a id="what-is-handlebars"></a>

[Handlebars](http://handlebarsjs.com/) ist die Templatesprache, die von Ghost verwendet wird.

> Handlebars liefert Dir die Fähigkeiten, um semantische Templates effektiv und ohne Frustration zu erstellen.

Wenn Du darüber nachdenkst, Dein eigenes Theme zu erstellen, solltest Du Dich vermutlich zuerst mit der Syntax von Handlebars vertraut machen. Lies Dir die [Handlebars-Dokumentation](http://handlebarsjs.com/expressions.html) durch oder sieh Dir dieses [Tutorial von Treehouse](http://blog.teamtreehouse.com/getting-started-with-handlebars-js) an. Du kannst dabei den ersten Abschnitt über Installation und Verwendung überspringen (diesen Teil haben bereits wir für Dich erledigt) und Dich sofort auf "Basic Expression" stürzen.

## Über Ghost-Themes <a id="about"></a>

Ghost-Themes sollen einfach erstell- und wartbar zu sein. Sie befürworten eine klare Trennung zwischen Templates (HTML) und jeder Geschäftslogik (JavaScript). Handlebars ist (fast) frei von Logik und unterstützt daher diese Trennung. Es bietet Hilfsmechanismen, sodass die Geschäftslogik zur Anzeige von Inhalten stets getrennt und unabhängig bleibt. Diese Trennung erleichtert die Zusammenarbeit zwischen DesignerInnen und EntwicklerInnen bei der Erstellung von Themes.

Handlebar-Templates sind hierarchisch (ein Template kann andere Templates erweitern) und unterstützen Teil-Templates. Ghost verwendet diese Features, um doppelten Code zu verringern und den Fokus jedes einzelnen Templates darauf zu richten, einen einzigen Job zu machen (und diesen dafür ordentlich).

Wir hoffen, Dir gefällt diese Herangehensweise an die Erstellung von Themes.

## Die Dateistruktur eines Ghost-Themes <a id="file-structure"></a>

Die empfohlene Dateistruktur ist:

```
.
├── /assets
|   └── /css
|       ├── screen.css
|   ├── /fonts
|   ├── /images
|   ├── /js
├── default.hbs
├── index.hbs [erforderlich]
└── post.hbs [erforderlich]
```

Vorerst gibt es keine Vorgabe, dass default.hbs oder einer der Ordner existieren müssen. <code class="path">index.hbs</code> und <code class="path">post.hbs</code> sind erforderlich – Ghost kann ohne diese beiden Templates nicht funktionieren. <code class="path">partials</code> ist ein spezieller Ordner. Er sollte alle Teil-Templates enthalten, die Du auf Deinem Blog verwenden möchtest. So kann <code class="path">list-post.hbs</code> z.B. Dein Template zur Darstellung eines einzelnen Posts in einer Liste beinhalten, welche Du dann auf der Homepage und in zukünftigen Archiv- & Tag-Seiten verwenden kannst. <code class="path">partials</code> ist außerdem der Ort, an dem Du Templates erstellen kannst, um eingebaute Templates die von bestimmten Helfern, wie der Paginierung, verwendet werden, zu überschreiben. Wenn Du eine Datei <code class="path">pagination.hbs</code> erstellst, kannst Du darin Dein eigenes HTML für die Paginierung erstellen.

### default.hbs

Dies ist das Basis-Template, welches all die langweiligen HTML-Bereiche enthält, die auf jeder Seite benötigt werden – die `<html>`-, `<head>`- und `<body>`-Tags zusammen mit den `{{ghost_head}}`- und `{{ghost_foot}}`-Helfern, sowie dem restlichen HTML für Header und Footer.

Das Basis-Template beinhaltet die Handlebars-Expression `{{{body}}}`, die definiert, wo der Inhalt der Templates, die das Basis-Template erweitern, eingefügt wird.

Seiten-Templates beinhaltet `{{!< default}}` in der allerersten Zeile, um zu definieren, dass sie das Basis-Template erweitern und dass ihr Inhalt an der Stelle in <code class="path">default.hbs</code>, an der `{{{body}}}` definiert ist, eingefügt werden soll.

### index.hbs

Dies ist das Template für die Homepage und erweitert <code class="path">default.hbs</code>. Die Homepage erhält eine Liste der Posts, die angezeigt werden sollen und <code class="path">index.hbs</code> definiert, wie jeder Post angezeigt werden soll.

In Casper (dem derzeitigen Standard-Theme) hat die Homepage einen größeren Header, welcher die globalen Einstellung von `@blog` verwendet, um Logo, Titel und Beschreibung des Blogs anzuzeigen. Darauf folgt mit Hilfe des `{{#foreach}}`-Helfers eine Liste der letzten Posts.

### post.hbs

Dies ist das Template für einen einzelnen Post, welches ebenfalls <code class="path">default.hbs</code> erweitert.

In Casper (dem derzeitigen Standard-Theme) hat das Template für einzelne Posts einen eigenen Header. Es verwendet dabei ebenfalls die globalen Einstellung von `@blog` und dann `{{#post}}`, um alle Post-Details anzuzeigen.

### Post-Styling & -Vorschau

Bitte beachte bei der Erstellung von Themes den Gültigkeitsbereich von Klassen und ganz besonders den Deiner IDs, um Konflikte zwischen den Haupt- und Post-Styles zu vermeiden. Man kann nie wissen, wann ein Klassenname oder eine ID (aufgrund der Autogenerierung der IDs für Überschriften) in einem Post verwendet wird. Deshalb ist es am besten, alles immer auf einen bestimmten Bereich der Seite zu beschränken. So kann ``#meine-id`` z.B. unerwartete Auswirkungen haben, während ``#themename-meine-id` deutlich sicherer wäre.

Ghost hat das Ziel, eine realistische Vorschau Deiner Posts als Teil des Split-Screen Editors zu bieten, wofür es jedoch notwendig ist, die individuellen Styles eines Themes im Adminbereich zu laden. Dieses Feature ist bisher nicht implementiert, aber wir empfehlen dringend, Deine Post-Styles in einer eigenen Datei (<code class="path">post.css</code>) getrennt von Deinen anderen Styles (<code class="path">style.css</code>) zu belassen, um in Zukunft schnell von diesem Feature Gebrauch machen zu können.

## Erstelle Dein eigenes Theme <a id="create-your-own"></a>

Erstelle Dein eigenes Ghost-Theme, indem Du entweder Casper kopierst oder im Ordner <code class="path">content/themes</code> einen neuen Ordner mit dem Namen Deines Themes erstellst, z.B. <code class="path">mein-theme</code> (Namen sollten kleingeschrieben werden und nur Buchstaben, Zahlen und Bindestriche enthalten). Dann erstelle zwei leere Dateien in Deinem Theme Ordner: <code class="path">index.hbs</code> und <code class="path">post.hbs</code>. Noch wird nichts angezeigt, doch dies ist im Endeffekt bereits ein gültiges Theme.

### Die Post-Liste

<code class="path">index.hbs</code> erhält ein Objekt namens `posts`, welches zusammen mit dem foreach-Helfer benutzt werden kann, um jeden Post auszugeben. Z.B.

```
{{#foreach posts}}
// Hier sind wir im Kontext eines einzelnen Posts.
// Was auch immer wir hier einfügen wird für jeden Post ausgeführt.
{{/foreach}}
```
Siehe auch den Abschnitt zum [`{{#foreach}}`](#foreach-helper)-Helfer für mehr Details.

#### Paginierung

Siehe auch den Abschnitt zum [`{{pagination}}`](#pagination-helper)-Helfer.

### Einzelne Posts ausgeben

Sobald Du im Kontext eines einzelnen Posts bist, entweder beim Durchlaufen der Posts mit `foreach` oder innerhalb von <code class="path">post.hbs</code>, hast Du Zugriff auf die Eigenschaften eines Posts.

Zur Zeit sind das:

*   id – *Post-ID*
*   title – *Post-Titel*
*   url – *die relative URL eines Posts*
*   content – *Post-HTML*
*   published_at – *Datum, an dem der Post veröffentlicht wurde*
*   author – *Komplette Details zum/zur PostautorIn* (mehr Details siehe weiter unten)

Jede dieser Eigenschaften kann mittels Standard-Handlebar-Expressions ausgegeben werden, z.B. `{{title}}`.

<div class="note">
  <p>
    <strong>Anmerkungen:</strong> <ul>
      <li>
        Die content-Eigenschaften werden überschrieben und mit dem <code>{{content}}</code>-Helfer ausgegeben, wodurch eine sichere & korrekte Ausgabe von HMTL gewährleistet wird. Wirf einen Blick auf den Bereich zum <a href="#content-helper"><code>{{content}}</code>-Helfer</a> für mehr Informationen.
      </li>
      <li>Die url-Eigenschaft wird vom <code>{{url}}</code>-Helfer bereitgestellt. Siehe den Abschnitt zum <a href="#url-helper"><code>{{url}}</code>-Helfer</a> für mehr Informationen.
      </li>
    </ul>
  </p>
</div>

#### PostautorIn

Innerhalb des Kontexts eines einzelnen Posts sind folgende Daten zum/zur AutorIn verfügbar:

*   `{{author.name}}` – der Name des/der AutorIn
*   `{{author.email}}` – die E-Mail-Adresse des/der AutorIn
*   `{{author.bio}}` – die Biografie des/der AutorIn
*   `{{author.website}}` – die Webseite des/der AutorIn
*   `{{author.image}}` – das Profilbild des/der AutorIn
*   `{{author.cover}}` – das Coverbild des/der AutorIn

Du kannst auch einfach `{{author}}` verwenden, um den Namen des/der AutorIn auszugeben.

All das kann auch mit einem Blockausdruck gemacht werden:

```
{{#author}}
    <a href="mailto:{{email}}">E-mail {{name}}</a>
{{/author}}
```

#### Post-Tags

Innerhalb des Kontexts eines einzelnen Posts sind folgende Daten zu Tags verfügbar:

*   `{{tag.name}}` – der Name des Tags

Du kannst `{{tags}}` verwenden, um eine Liste von mittels Komma getrennten Tags auszugeben, oder, falls Du das bevorzugst, Dein eigenes Trennzeichen angeben `{{tags separator=""}}`.

All das kann auch mit einem Blockausdruck gemacht werden:

```
<ul>
    {{#tags}}
        <li>{{name}}</li>
    {{/tags}}
</ul>
```

### Globale Einstellungen

Ghost-Themes haben mittels `@blog` Zugriff auf einige globale Einstellungen.

*   `{{@blog.url}}` – die URL für dieses env in <code class="path">config.js</code>
*   `{{@blog.title}}` – der Titel des Blogs von der Settings-Seite
*   `{{@blog.description}}` – die Beschreibung des Blogs von der Settings-Seite
*   `{{@blog.logo}}` – das Bloglogo von der Settings-Seite

## Eingebaute Helfer <a id="helpers"></a>

Ghost hat einige eingebaute Helfer, die Dir Werkzeuge zur Erstellung Deines Themes zur Verfügung stellen. Helfer teilen sich in die beiden Gruppen Block- und Ausgabehelfer auf.

**[Blockhelfer](http://handlebarsjs.com/block_helpers.html)** haben einen Anfangs- und End-Tag z.B. `{{#foreach}}{{/foreach}}`. Der Kontext zwischen den Tags ändert sich, und diese Helfer stellen Dir zusätzliche Eigenschaften zur Verfügung, auf die Du mittels des `@`-Symbols zugreifen kannst.

**Ausgabehelfer** sehen sehr ähnlich wie Expressions zur Ausgabe von Daten aus, z.B. `{{content}}`. Sie bereiten die Daten hilfreich auf, bevor sie ausgegeben werden und bieten oft Optionen zur Ausgabe der Daten. Manche Ausgabehelfer verwenden Templates, um die Daten zu formatieren, ähnlich wie Partials. Manche Ausgabehelfer sind gleichzeitig Blockhelfer und bieten eine Variation ihrer Funktionalität an.

### <code>foreach</code> <a id="foreach-helper"></a>

*   Helfertyp: Block
*   Optionen: `columns` (Zahl)

`{{#foreach}}` ist ein spezieller Schleifenhelfer für die Arbeit mit Listen von Posts. Standardmäßig fügt der each-Helfer in Handlebars die privaten Eigenschaften `@index` für Arrays und `@key` für Objekte hinzu, welche innerhalb der each-Schleife verwendet werden können.

`foreach` erweitert dies und fügt zusätzlich die privaten Eigenschaften `@first`, `@last`, `@even`, `@odd`, `@rowStart` und `@rowEnd` hinzu. Das kann man nutzen, um komplexere Layouts für die Auflistung von Posts und anderer Inhalte zu erstellen. Einige Beispiele:

#### `@first` & `@last`

Das folgende Beispiel prüft ein Array oder Objekt, z.B. `posts`, und testet auf den ersten Eintrag.

```
{{#foreach posts}}
    {{#if @first}}
        <div>Erster Post</div>
    {{/if}}
{{/foreach}}
```

Wir können `if` auch verschachteln, um mehrere Eigenschaften zu überprüfen. In diesem Beispiel können wir den ersten und letzten Post getrennt von den anderen ausgeben.

```
{{#foreach posts}}
    {{#if @first}}
    <div>Erster Post</div>
    {{else}}
        {{#if @last}}
            <div>Letzter Post</div>
        {{else}}
            <div>Alle anderen Posts</div>
        {{/if}}
    {{/if}}
{{/foreach}}
```

#### `@even` & `@odd`

Das folgende Beispiel fügt eine Klasse für gerade und ungerade hinzu, was für Zebra Striping von Inhalten verwendet werden kann.

```
{{#foreach posts}}
        <div class="{{#if @even}}gerade{{else}}ungerade{{/if}}">{{title}}</div>
{{/foreach}}
```

#### `@rowStart` & `@rowEnd`

Das folgende Beispiel zeigt, wie man ein column-Argument übergibt, um Klassen für das erste und letzte Element in einer Zeile zu vergeben. Dies ermöglicht es, Inhalte in einem Raster auszugeben.

```
{{#foreach posts columns=3}}
    <li class="{{#if @rowStart}}erstes{{/if}}{{#if @rowEnd}}letztes{{/if}}">{{title}}</li>
{{/foreach}}
```

### <code>content</code> <a id="content-helper"></a>

*   Helfertyp: Ausgabe
*   Optionen: `words` (Zahl), `characters` (Zahl) [Standard: Alles anzeigen]

`{{content}}` ist ein sehr einfacher Helfer zur Ausgabe des Inhalts eines Posts. Er sorgt dafür, dass HTML korrekt ausgegeben wird.

Du kannst die Menge an ausgegebenem HTML beschränken, indem Du eine der folgenden Optionen übergibst:

`{{content words="100"}}` gibt nur 100 Zeichen HTML aus, mit korrekt gefilterten Tags.

### <code>excerpt</code> <a id="excerpt-helper"></a>

*   Helfertyp: Ausgabe
*   Optionen: `words` (Zahl), `characters` (Zahl) [Standard: 50 Wörter]

`{{excerpt}}` gibt den Inhalt aus, aber entfernt jegliches HTML. Dies ist hilfreich für Auszüge von Posts.

Du kannst die Menge an ausgegebenem Text durch folgende Optionen beschränken:

`{{excerpt characters="140"}}` gibt 140 Zeichen Text aus.

### <code>date</code> <a id="date-helper"></a>

*   Helfertyp: Ausgabe
*   Optionen: `format` (Datumsformat, Standard: “MMM Do, YYYY”), `timeago` (Boolean)

`{{date}}` ist ein Formatierungshelfer zur Ausgabe von Daten in verschiedenen Formatierungen. Du kannst entweder ein Datum und einen Formatierungsstring übergeben, um das Datum wie folgt auszugeben:

```
// gibt etwas Ähnliches wie 'July 11, 2014' aus
{{date published_at format="MMMM DD, YYYY"}}
```

oder Du kannst ein Datum und den timeago-Schalter übergeben:

```
// gibt etwas Ähnliches wie '5 mins ago' aus
{{date published_at timeago="true"}}
```

Wenn Du `{{date}}` ohne ein Format aufrufst, lautet die Standardformatierung “MMM Do, YYYY”.

Wenn Du `{{date}}` im Kontext eines Posts aufrufst, ohne ein Datum anzugeben, ist der Standardwert `published_at`.

Wenn Du `{{date}}` außerhalb des Kontexts eines Posts ohne Angabe eines Datums aufrufst, ist der Standardwert das aktuelle Datum.

`date` verwendet [moment.js](http://momentjs.com/) zur Formatierung der Daten. Eine komplette Erklärung der verschiedenen Formatierungsstrings, die Du verwenden kannst, findest Du in der [moment.js-Dokumentation](http://momentjs.com/docs/#/parsing/string-format/).

### <code>url</code> <a id="url-helper"></a>

*   Helfertyp: Ausgabe
*   Optionen: `absolute`

`{{url}}` gibt die relative URL für einen Post aus, wenn man sich im Kontext eines Posts befindet. Außerhalb des Postkontexts gibt dies nichts aus.

Du kannst den URL-Helfer zwingen, eine absolute URL auszugeben, indem Du die absolute Option verwendest, z.B. `{{url absolute="true"}}`

###  <code>pagination</code> <a href="pagination-helper"></a>

*   Helfertyp: Ausgabe, verwendet Template
*   Optionen: keine (kommen bald)

`{{pagination}}` ist ein Templatehelfer, der, sofern verfügbar, HTML für Links zu 'neueren Posts' und 'älteren Posts' ausgibt sowie anzeigt, auf welcher Seite Du Dich befindest.

Du kannst das HTML, das dieser Helfer ausgibt, überschreiben, indem Du eine Datei namens <code class="path">pagination.hbs</code> in <code class="path">content/themes/your-theme/partials</code> erstellst.

### <code>body_class</code> <a id="bodyclass-helper"></a>

*   Helfertyp: Ausgabe
*   Optionen: keine

`{{body_class}}` – gibt Klassen für den `<body>`-Tag in <code class="path">default.hbs</code> aus, was hilfreich ist, um Styles für spezifische Seiten zu erstellen.

### <code>post_class</code> <a id="postclass-helper"></a>

*   Helfertyp: Ausgabe
*   Optionen: keine

`{{post_class}}` – gibt Klassen für den Postcontainer aus, was hilfreich ist, um Styles für Posts zu erstellen.

### <code>ghost_head</code> <a id="ghosthead-helper"></a>

*   Helfertyp: Ausgabe
*   Optionen: keine

`{{ghost_head}}` – gehört direkt vor den `</head>` Tag in <code class="path">default.hbs</code> und wird verwendet, um Meta-Tags, Scripts und Styles auszugeben. Hierfür wird es Hooks geben.

### <code>ghost_foot</code> <a id="ghostfoot-helper"></a>

*   Helfertyp: Ausgabe
*   Optionen: keine

`{{ghost_foot}}` – gehört direkt vor den `</body>`-Tag in <code class="path">default.hbs</code> und wird verwendet, um Scripts auszugeben. Gibt standardmäßig jquery aus. Hierfür wird es Hooks geben.

### <code>meta_title</code> <a id="metatitle-helper"></a>

*   Helfertyp: Ausgabe
*   Optionen: keine

`{{meta_title}}` – gibt in Posts den Posttitel und andernfalls den Titel des Blogs aus. Wird verwendet, um title-Tags im `</head>`-Block auszugeben, z.B. `<title>{{meta_title}}</title>`. Hierfür wird es Hooks geben.

### <code>meta_description</code> <a id="metatitledescription-helper"></a>

*   Helfertyp: Ausgabe
*   Optionen: keine

`{{meta_description}}` - gibt (derzeit) nichts bei Posts und andernfalls die Beschreibung des Blogs aus. Wird verwendet, um den description-Meta-Tag auszugeben, z.B. `<meta name="description" content="{{meta_description}}" />`. Hierfür wird es Hooks geben.

## Themes-Fehlerbehebung <a id="troubleshooting"></a>

#### 1. Ich erhalte den Fehler 'Error: Failed to lookup view "index" or "post"'

Überprüfe, dass Dein Themeordner die korrekt benannten Dateien <code class="path">index.hbs</code> und <code class="path">post.hbs</code> beinhaltet, da diese erforderlich sind.

{% endraw %}
