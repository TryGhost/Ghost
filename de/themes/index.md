---
lang: de
layout: themes
meta_title: Wie man Ghost Themes erstellt - Ghost Docs
meta_description: Eine detaillierte Anleitung wie man Themes für die Ghost Blogging Plattform erstellt. Alles was du wissen musst um Themes für Ghost zu erstellen.
heading: Ghost Themes
subheading: Leg los mit deinen eigenen Themes für Ghost
chapter: themes
---

{% raw %}

## Theme wechseln <a id="switching-theme"></a>

Du findest Ghost Themes in <code class="path">content/themes/</code>

Wenn du ein anderes Theme als das Standard Theme Casper verwenden möchtest wirf einen Blick auf unsere [Marketplace Galerie](http://marketplace.ghost.org/). 
Lade dir das Theme Paket deiner Wahl herunter, entpacke es und verschiebe es nach <code class="path">content/themes</code> neben Casper.

Wenn du dein eigenes erstellen möchtest empfehlen wir dir den casper Ordner zu kopieren und die Templates so anzupassen dass sie so aussehen und funktionieren wie du möchtest.

Um zu deinem neu erstellten Theme zu wechseln:

1. Starte Ghost neu. Zur Zeit bemerkt Ghost nicht dass du ein neues Theme in <code class="path">content/themes</code> hinzugefügt hast also musst du es neu starten.
2. Logge dich in den Admin-Bereich von Ghost ein und navigiere zu <code class="path">/ghost/settings/general/</code>.
3. Wähle dein Theme im "Theme" Auswahlfeld.
4. Klicke "Save"
5. Besuche das Frontend deines Blogs und staune über dein neues Theme.

## Was ist Handlebars? <a id="what-is-handlebars"></a>

[Handlebars](http://handlebarsjs.com/) ist die Template Sprache die Ghost verwendet.

> Handlebars liefert dir die Fähigkeiten um semantische Templates effektiv und ohne Frustration zu erstellen.

Wenn du darüber nachdenkst dein eigenes Theme zu erstellen solltest du dich vermutlich zuerst mit der Syntax von Handlebars vertraut machen. Lies dir die [Handlebars Dokumentation](http://handlebarsjs.com/expressions.html) durch oder sieh dir dieses [Tutorial von Treehouse](http://blog.teamtreehouse.com/getting-started-with-handlebars-js) an - du kannst dabei den ersten Abschnitt über Installation und Verwendung überspringen (diesen Teil haben wir für dich schon erledigt) und kannst dich sofort auf "Basic Expression" stürzen.

## Über Ghost Themes <a id="about"></a>

Ghost Themes sind dafür gedacht einfach erstell- und wartbar zu sein. Sie befürworten eine klare Trennung zwischen Templates (das HTML) und jeder Geschäftslogik (JavaScript). Handlebars ist (fast) frei von Logik und unterstützt daher diese Trennung. Es bietet Hilfsmechanismen sodass die Geschäftslogik zur Anzeige von Inhalten stets getrennt und unabhängig bleibt. Diese Trennung erleichtert die Zusammenarbeit zwischen Designern und Entwicklern bei der Erstellung von Themes.

Handlebar Templates sind hierarchisch (ein Template kann andere Templates erweitern) und unterstützt Teil-Templates. Ghost verwendet diese Features um doppelten Code zu verringern und den Fokus jedes einzelnen Templates darauf zu richten einen einizigen Job zu machen, aber den ordentlich.

Wir hoffen dir gefällt diese Herangehensweise an die Erstellung von Themes.

## Die Dateistruktur eines Ghost Themes <a id="file-structure"></a>

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

Vorerst gibt es keine Vorgabe dass default.hbs oder irgend einer der Ordner existiert. <code class="path">index.hbs</code> und <code class="path">post.hbs</code> sind erforderlich – Ghost wird ohne diese zwei Templates nicht funktionieren. <code class="path">partials</code> ist ein spezieller Ordner. Er sollte alle Teil-Templates enthalten die du auf deinem Blog verwenden möchtest, so kann <code class="path">list-post.hbs</code> z.B. dein Template zur Darstellung eines einzelnen Posts in einer Liste beinhalten welche du dann auf der Homepage und in zukünftigen Archiv & Tag-Seiten verwenden kannst. <code class="path">partials</code> ist außerdem der Ort an dem du Templates erstellen kannst um eingebaute Templates die von bestimmten Helfern wie der Paginierung verwendet werden zu überschreiben. Wenn du eine Datei <code class="path">pagination.hbs</code> erstellst kannst du darin dein eigenes HTML für die Paginierung erstellen.

### default.hbs

Das ist das Basis-Template welches all die langweiligen HTML-Bereiche enthält die auf jeder Seite benötigt werden – die `<html>`, `<head>` und `<body>` Tags zusammen mit den `{{ghost_head}}` und `{{ghost_foot}}` Helfern, sowie dem restlichen HTML für Header und Footer.

Das Basis-Template beinhaltet die Handlebars Expression `{{{body}}}` die definiert wo der Inhalt der Templates die das Basis-Template erweitern eingefügt wird.

Seiten-Templates beinhaltet dann `{{!< default}}` in der allerersten Zeile um zu definieren dass sie das Basis-Template erweitern und dass ihr Inhalt an der Stelle in default.hbs wo `{{{body}}}` definiert ist eingefügt werden soll.

### index.hbs

Dies ist das Template für die Homepage und erweitert <code class="path">default.hbs</code>. Die Homepage erhält eine Liste der Posts die angezeigt werden sollen und <code class="path">index.hbs</code> definiert wie jeder Post angezeigt werden soll.

In Casper (dem derzeitigen Standard-Theme) hat die Homepage einen größeren Header welcher die globalen Einstellung von `@blog` verwendet um Logo, Titel und Beschreibung des Blogs anzuzeigen. Darauf folgt mit Hilfe des `{{#foreach}}` Helfers eine Liste der letzten Posts.

### post.hbs

Dies ist das Template für einen einzelnen Post welches ebenfalls <code class="path">default.hbs</code> erweitert.

In Casper (dem derzeitigen Standard-Theme) hat das Template für einzelne Posts einen eigenen Header, verwendet dabei ebenfalls die globalen Einstellung von `@blog` und verwendet dann `{{#post}}` um alle Post-Details anzuzeigen.

### Post Styling & Vorschau

Bitte beachte bei der Erstellung von Themes den Gültigkeitsbereich von Klassen und ganz besonders von deinen IDs um Konflikte zwischen den Haupt- und Post-Styles zu vermeiden. Man kann nie wissen wann ein Klassenname oder eine ID (wegen der Auto-Generierung der IDs für Überschriften) in einem Post verwendet wird. Deshalb ist es am besten alles immer auf einen bestimmten Bereich der Seite zu beschränken. So kann #meine-id z.B. unerwartete Auswirkungen haben, während #themename-meine-id deutlich sicherer wäre.

Ghost hat das Ziel eine realistische Vorschau deiner Posts als Teil des Split-Screen Editors zu bieten wofür es jedoch notwendig ist die individuellen Styles eines Themes im Admin-Bereich zu laden. Dieses Feature ist bis jetzt nicht implementiert, aber wir empfehlen dringend deine Post Styles in einer eigenen Datei (post.css) getrennt von deinen anderen Styles (style.css) zu belassen um in Zukunft schnell von diesem Feature Gebrauch machen zu können.

## Erstelle dein eigenes Theme <a id="create-your-own"></a>

Erstelle dein eigenes Ghost Theme indem du entweder Casper kopierst oder im Ordner <code class="path">content/themes</code> einen neuen Ordner mit dem Namen deines Themes erstellst, z.B. mein-theme (Namen sollten klein geschrieben werden und nur Buchstaben, Zahlen und Bindestriche enthalten). Dann erstelle zwei leere Dateien in deinem Theme Ordner: index.hbs und post.hbs. Noch wird nichts angezeigt, aber das ist im Endeffekt bereits ein gültiges Theme.

### Die Post Liste

<code class="path">index.hbs</code> erhält ein Objekt namens `posts` welches zusammen mit dem foreach Helfer benutzt werden kann um jeden Post auszugeben. Z.B.

```
{{#foreach posts}}
// Hier sind wir im Kontext eines einzelnen Posts
// Was auch immer wir hier einfügen wird für jeden Post ausgeführt
{{/foreach}}
```
Siehe auch den Abschnitt zum [`{{#foreach}}`](#foreach-helper) Helfer für mehr Details.

#### Paginierung

Siehe auch den Abschnitt zum [`{{pagination}}`](#pagination-helper) Helfer.

### Einzelne Posts ausgeben

Sobald du im Kontext eines einzelnen Posts bist, entweder beim durchlaufen der Posts mit `foreach`oder innerhalb von <code class="path">post.hbs</code>, hast du Zugriff auf die Eigenschaften eines Posts.

Zur Zeit sind das:

*   id – *Post ID*
*   title – *Post Titel*
*   url – *die relative URL eines Posts*
*   content – *Post HTML*
*   published_at – *Datum an dem der Post veröffentlicht wurde*
*   author – *Komplette Details des Post Autors* (siehe weiter unten für mehr Details)

Jede dieser Eigenschaften kann mittels Standard Handlebar Expressions ausgegeben werden, z.B. `{{title}}`.

<div class="note">
  <p>
    <strong>Anmerkungen:</strong> <ul>
      <li>
        die content Eigenschaften wird überschrieben und mit dem <code>{{content}}</code> Helfer ausgegeben wodurch gewährleistet wird dass HTML sicher & korrekt ausgegeben wird. Wirf einen Blick auf den Bereich zum <a href="#content-helper"><code>{{content}}</code> Helfer</a> für mehr Informationen.
      </li>
      <li>
die url Eigenschaft wird vom <code>{{url}}</code> Helfer bereitgestellt. Siehe den Abschnitt zum <a href="#url-helper"><code>{{url}}</code> Helfer</a> für mehr Informationen.
      </li>
    </ul>
  </p>
</div>

#### Post Autor

Innerhalb des Kontextes eines einzelnen Posts sind folgende Daten zum Autor verfügbar:

*   `{{author.name}}` – der Name des Autors
*   `{{author.email}}` – die E-Mail Adresse des Autors
*   `{{author.bio}}` – die Biografie des Autors
*   `{{author.website}}` – die Webseite des Autors
*   `{{author.image}}` – das Profilbild des Autors
*   `{{author.cover}}` – das Coverbild des Autors

Du kannst auch einfach `{{author}}` verwenden um den Namen des Autors auszugeben.

All das kann auch mit einem Blockausdruck gemacht werden:

```
{{#author}}
    <a href="mailto:{{email}}">Email {{name}}</a>
{{/author}}
```

#### Post Tags

Innerhalb des Kontextes eines einzelnen Posts sind folgende Daten zu Tags verfügbar:

*   `{{tag.name}}` – der Name des Tags

Du kannst `{{tags}}` verwenden um eine Liste von Komma-getrennten Tags auszugeben, oder, falls du das bevorzugst, dein eigenes Trennzeichen angeben `{{tags separator=""}}`

All das kann auch mit einem Blockausdruck gemacht werden:

```
<ul>
    {{#tags}}
        <li>{{name}}</li>
    {{/tags}}
</ul>
```

### Globale Einstellungen

Ghost Themes haben mittels `@blog` Zugriff auf einige globale Einstellungen.

*   `{{@blog.url}}` – die URL für dieses env in <code class="path">config.js</code>
*   `{{@blog.title}}` – der Titel des Blogs von der Settings Seite
*   `{{@blog.description}}` – die Beschreibung des Blogs von der Settings Seite
*   `{{@blog.logo}}` – das Blog Logo von der Settings Seite

## Eingebaute Helfer <a id="helpers"></a>

Ghost hat einige eingebaute Helfer die dir Werkzeuge zur Verfügung stellen die du brauchst um dein Theme zu erstellen. Helfer teilen sich in die zwei Gruppen Block- und Ausgabe-Helfer auf.

**[Block Helfer](http://handlebarsjs.com/block_helpers.html)** haben einen Anfang und Ende Tag z.B. `{{#foreach}}{{/foreach}}`. Der Kontext zwischen den Tags ändert sich und diese Helfer stellen dir außerdem zusätzliche Eigenschaften zur Verfügung auf die du mittels dem `@` Symbol zugreifen kannst.

**Ausgabe Helfer** sehen sehr ähnlich wie Expressions zur Ausgabe von Daten aus z.B. `{{content}}`. Sie bereiten die Daten hilfreich auf bevor sie ausgegeben werden und bieten oft Optionen zur Ausgabe der Daten. Manche Ausgabe Helfer verwenden Templates um die Daten zu formatieren, ein bisschen wie Partials. Manche Ausgabe Helfer sind gleichzeitig Block Helfer und bieten eine Variation ihrer Funktionalität an.

### <code>foreach</code> <a id="foreach-helper"></a>

*   Helfer Typ: Block
*   Optionen: `columns` (Zahl)

`{{#foreach}}` ist ein spezieller Schleifen-Helfer für die Arbeit mit Listen von Posts. Standardmäßig fügt der each Helfer in Handlebars die privaten Eigenschaften `@index` für Arrays und `@key` für Objekte hinzu welche innerhalb der each Schleife verwendet werden können.

`foreach` erweitert das und fügt zusätzlich die privaten Eigenschaften `@first`, `@last`, `@even`, `@odd`, `@rowStart` und `@rowEnd` hinzu. Das kann man nutzen um komplexere Layouts für die Auflistung von Posts und anderer Inhalte zu erstellen. Einige Beispiele:

#### `@first` & `@last`

Das folgende Beispiel prüft ein Array oder Objekt z.B. `posts` und testet auf den ersten Eintrag.

```
{{#foreach posts}}
    {{#if @first}}
        <div>Erster Post</div>
    {{/if}}
{{/foreach}}
```

Wir können `if` auch verschachteln um mehrere Eigenschaften zu überprüfen. In diesem Beispiel können wir den ersten und letzten Post getrennt von den anderen ausgeben.

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

Das folgende Beispiel fügt eine Klasse für gerade und ungerade hinzu, was man für zebra striping von Inhalten verwenden kann.

```
{{#foreach posts}}
        <div class="{{#if @even}}gerade{{else}}ungerade{{/if}}">{{title}}</div>
{{/foreach}}
```

#### `@rowStart` & `@rowEnd`

Das folgende Beispiel zeigt wie man ein column Argument übergibt um Klassen für das erste und letzte Element in einer Zeile zu vergeben. Das ermöglicht Inhalte in einem Raster auszugeben.

```
{{#foreach posts columns=3}}
    <li class="{{#if @rowStart}}erstes{{/if}}{{#if @rowEnd}}letztes{{/if}}">{{title}}</li>
{{/foreach}}
```

### <code>content</code> <a id="content-helper"></a>

*   Helfer Typ: Ausgabe
*   Optionen: `words` (Zahl), `characters` (Zahl) [Standard alles anzeigen]

`{{content}}` ist ein sehr einfacher Helfer zur Ausgabe des Inhalts eines Posts. Er sorgt dafür dass HTML korrekt ausgegeben wird.

Du kannst die Menge an ausgegebenem HTML beschränken indem du eine der folgenden Optionen übergibst:

`{{content words="100"}}` gibt nur 100 Zeichen HTML aus mit korrekt gefilterten Tags.

### <code>excerpt</code> <a id="excerpt-helper"></a>

*   Helfer Typ: Ausgabe
*   Optionen: `words` (Zahl), `characters` (Zahl) [Standard 50 Worte]

`{{excerpt}}` gibt den Inhalt aus aber entfernt jegliches HTML. Das ist hilfreich für Auszüge von Posts.

Du kannst die Menge an ausgegebenem Text durch folgende Optionen beschränken:

`{{excerpt characters="140"}}` gibt 140 Zeichen Text aus.

### <code>date</code> <a id="date-helper"></a>

*   Helfer Typ: Ausgabe
*   Optionen: `format` (Datumsformat, Standard “MMM Do, YYYY”), `timeago` (Boolean)

`{{date}}` ist ein Formatierungshelfer zur Ausgabe von Daten in verschiedenen Formatierungen. Du kannst entweder ein Datum und einen Formatierungsstring übergeben die verwendet werden um das Datum so auszugeben:

```
// gibt etwas ähnliches wie 'July 11, 2013' aus
{{date published_at format="MMMM DD, YYYY"}}
```

oder du kannst ein Datum und den timeago Schalter übergeben:

```
// gibt etwas ähnliches wie '5 mins ago' aus
{{date published_at timeago="true"}}
```

Wenn du `{{date}}` ohne ein Format aufrufst lautet die Standardformatierung “MMM Do, YYYY”.

Wenn du `{{date}}` im Kontext eines Posts aufrufst ohne ein Datum anzugeben ist der Standardwert `published_at`.

Wenn du `{{date}}` außerhalb des Kontexts eines Posts ohne Angabe eines Datums aufrufst ist der Standardwert das aktuelle Datum.

`date` verwendet [moment.js](http://momentjs.com/)  zur Formatierung der Daten. Eine komplette Erklärung aller verschiedenen Formatierungsstrings die du verwenden kannst findest du in dessen [Dokumentation](http://momentjs.com/docs/#/parsing/string-format/).

### <code>url</code> <a id="url-helper"></a>

*   Helfer Typ: Ausgabe
*   Optionen: `absolute`

`{{url}}` gibt die relative URL für einen Post aus wenn man sich im Kontext eines Posts befindet. Außerhalb des Post Kontexts gibt es nichts aus.

Du kannst den URL Helfer zwingen eine absolute URL auszugeben indem du die absolute Option verwendest, z.B. `{{url absolute="true"}}`

###  <code>pagination</code> <a href="pagination-helper"></a>

*   Helfer Typ: Ausgabe, verwendet Template
*   Optionen: keine (kommt bald)

`{{pagination}}` ist ein Template Helfer der sofern verfügbar HTML für Links zu 'neueren Posts' und 'älteren Posts' ausgibt sowie anzeigt auf welcher Seite du dich befindest.

Du kannst das HTML das dieser Helfer ausgibt überschreiben indem du eine Datei namens <code class="path">pagination.hbs</code> in <code class="path">content/themes/your-theme/partials</code> erstellst.

### <code>body_class</code> <a id="bodyclass-helper"></a>

*   Helfer Typ: Ausgabe
*   Optionen: keine

`{{body_class}}` – Gibt Klassen für den `<body>` Tag in <code class="path">default.hbs</code> aus was hilfreich ist um Styles für spezifische Seiten zu erstellen.

### <code>post_class</code> <a id="postclass-helper"></a>

*   Helfer Typ: Ausgabe
*   Optionen: keine

`{{post_class}}` – Gibt Klassen für den Post Container aus was hilfreich ist um Styles für Posts zu erstellen.

### <code>ghost_head</code> <a id="ghosthead-helper"></a>

*   Helfer Typ: Ausgabe
*   Optionen: keine

`{{ghost_head}}` – Gehört direkt vor den `</head>` Tag in <code class="path">default.hbs</code> und wird verwendet um Meta Tags, Scripts und Styles auszugeben. Dafür wird es Hooks geben.

### <code>ghost_foot</code> <a id="ghostfoot-helper"></a>

*   Helfer Typ: Ausgabe
*   Optionen: keine

`{{ghost_foot}}` – Gehört direkt vor den `</body>` Tag in <code class="path">default.hbs</code> und wird verwendet um Scripts auszugeben. Gibt standardmäßig jquery aus. Dafür wird es Hooks geben.

### <code>meta_title</code> <a id="metatitle-helper"></a>

*   Helfer Typ: Ausgabe
*   Optionen: keine
 
`{{meta_title}}` – Gibt den in Posts den Titelund sonst den Titel des Blogs aus. Wird verwendet um title Tags im `</head>` Block auszugeben, z.B. `<title>{{meta_title}}</title>`. Dafür wird es Hooks geben.

### <code>meta_description</code> <a id="metatitledescription-helper"></a>

*   Helfer Typ: Ausgabe
*   Optionen: keine

`{{meta_description}}` - Gibt (derzeit) nichts bei Posts und sonst die Beschreibung des Blogs aus. Wird verwendet um den description Meta Tag auszugeben,  z.B. `<meta name="description" content="{{meta_description}}" />`. Dafür wird es Hooks geben.

## Themes Fehlerbehebung <a id="troubleshooting"></a>

#### 1. Ich erhalte den Fehler Error: Failed to lookup view "index" or "post"

Überprüfe dass dein Theme Ordner korrekt benannte index.hbs und post.hbs beinhaltet da diese erforderlich sind.

{% endraw %}
