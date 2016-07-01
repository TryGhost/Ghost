---
lang: id_ID
layout: themes
meta_title: Bagaimana Cara Membuat Tema Ghost - Ghost Docs
meta_description: Sebuah petunjuk mendalam pembuatan tema untuk platform blogging Ghost. Semua hal yang Anda butuhkan untuk membangun sebuah Tema untuk Ghost.
heading: Tema Ghost
subheading: Memulai membuat sendir tema untuk Ghost
chapter: themes
---

{% raw %}

## Berganti Tema <a id="switching-theme"></a>

Tema Ghost terletak di direktori <code class="path">content/themes/</code>

Jika Anda ingin menggunakan tema yang berbeda dari Casper sebagai tema baku, cobalah kunjungi [galeri marketplace](http://marketplace.ghost.org/). Unduhlah paket tema yang sesuai pilihan Anda, kemudian ekstrak dan tempatkanlah di dalam direktori <code class="path">content/themes</code> berdampingan dengan Casper.

Jika Anda ingin berkreasi dengan membuat tema baru, kami sarankan untuk menyalin dan mengubah nama direktori casper & mengubah templatnya agar terlihat dan berfungsi seperti yang Anda inginkan.

Untuk beralih menggunakan tema yang baru saja Anda tambahkan, lakukan hal berikut:

1.  Mulai ulang Ghost. Pada saat ini, Ghost tidak akan sadar bahwa Anda telah menambahkan sebuah direktori baru di dalam <code class="path">content/themes</code>. Karenanya Ghost perlu dimulai ulang.
2.  Masuklah ke halaman admin Ghost, lalu navigasikan ke <code class="path">/ghost/settings/general/</code>
3.  Pilihlah nama Tema di dalam pilihan dropdown 'Tema'
4.  Klik 'Save'
5.  Kunjungilah dan muat ulang halaman utama blog Anda untuk melihat tampilan dengan tema baru.

<p class="note">**Catatan:** Jika Anda menggunakan Layanan Hosting milik Ghost, untuk mengganti tema yang Anda sukai, Anda dapat pergi ke halaman<a href="https://ghost.org/blogs/">pengelolaan blog</a> lalu klik "edit" di samping nama blog Anda.</p>


##  Apa itu Handlebars? <a id="what-is-handlebars"></a>

[Handlebars](http://handlebarsjs.com/) adalah bahasa pembuat templat yang digunakan oleh Ghost.

> Handlebars menyediakan kemampuan yang dibutuhkan untuk membangun templat semantik secara efektif dan tanpa frustasi.

Apabila Anda ingin segera memulai menulis tema Anda sendiri, mungkin terlebih dahulu Anda ingin menjadikan diri Anda lebih familiar dengan sintaksis dari handlebars. Oleh karena itu, bacalah [dokumentasi handlebars](http://handlebarsjs.com/expressions.html), atau lihatlah [tutorial dari Treehouse](http://blog.teamtreehouse.com/getting-started-with-handlebars-js) – Anda dapat melewatkan bagian instalasi dan penggunaan (karena kami telah menyelesaikan sebagiannya untuk Anda), jadi langsung saja dalami ‘Basic Expressions’.

Selain itu, Ghost juga menggunakan pustaka tambahan yang disebut `express-hbs`. Pustaka ini bertujuan untuk menambahkan [fitur tambahan](https://github.com/barc/express-hbs#syntax) pada bagian handlebars yang sangat sering digunakan Ghost, seperti [layouts](#default-layout) dan [partials](#partials).

## Tema Ghost <a id="about"></a>

Pertemaan pada Ghost ditujukan untuk semudah mungkin dibangun dan dikelola. Mereka mengikuti prinsip yang kuat untuk memisahkan antara template (HTML) dan logika (JavaScript). Bisa dikatakan bahwa Handlebars (hampir) tidak berlogika dan menekankan prinsip pemisahan ini dengan menyediakan mekanisme bantu sehingga logika untuk menampilkan konten tetap terpisah dan mandiri. Hal ini tentu saja berakibat pada mudahnya kolaborasi antara perancang dan pengembang ketika membangun sebuah tema.

Karena templat Handlebars bersifat hierarkis (sebuah templat dapat menurunkan templat lainnya) dan mendukung templat parsial, Ghost menggunakan fitur tersebut untuk mengurangi duplikasi kode dan menjaga masing-masing templat untuk tetap fokus melakukan sebuah fungsi, dan melakukannya dengan baik. Sebuah tema yang terstruktur dengan baik akan memudahkan pengelolaan dan dengan menjaga agar komponen-komponen didalamnya tetap terpisah satu sama lain, akan memudahkan kita untuk menggunakannya ulang di antara tema.

Kami sangat berharap bahwa Anda juga menikmati pendekatan mengenai pembuatan tema ini.

## Struktur Pemberkasan pada Sebuah Tema Ghost <a id="file-structure"></a>

Struktur berkas yang kami sarankan adalah:

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

Untuk saat ini tidak ada persyaratan bahwa <code class="path">default.hbs</code> atau direktori lainnya harus tersedia. Walupun demikian, kami sarankan agar Anda menyimpan semua aset yang dibutuhkan di dalam direktori <code class="path">asset</code>, dan mendayagunakan [`{{asset}}` bantuan](#asset-helper) untuk menyediakan berkas css, js, gambar, font dan berkas aset lainnya.

<code class="path">index.hbs</code> dan <code class="path">post.hbs</code> adalah dua berkas yang sangat dibutuhkan – Ghost tidak akan berfungsi dengan baik jika tidak terdapat dua templat ini.

### Partials <a id="partials"></a>

Anda juga dapat menambahkan direktori <code class="path">partials</code> ke dalam tema yang Anda buat jika dinginkan. Direktori tersebut harus menyertakan bagian-bagian templat yang ingin Anda gunakan dalam blog Anda, sebagai contoh templat <code class="path">list-post.hbs</code> dapat Anda tambahkan untuk menampilkan sebuah artikel tunggal dalam sebuah daftar yang kemudian dapat digunakan pada halaman utama dan dalam halaman arsip & tag. <code class="path">partials</code> juga dapat digunakan untuk menyimpan templat untuk mengesampingkan templat bawaan yang digunakan oleh beberapa pembantu seperti *pagination*. Dengan menyertakan sebuah berkas templat <code class="path">pagination.hbs</code> di dalam <code class="path">partials</code> ini akan memudahkan Anda mengkhususkan HTML Anda untuk keperluan *pagination.

### default.hbs <a id="default-layout"></a>

Berkas ini merupakan templat tata letak baku atau templat dasar di mana semua bit HTML yang harus tampil di setiap halaman, berada – berisi tag `<html>`, `<head>` dan `<body>` bersama dengan pembantu `{{ghost_head}}` dan `{{ghost_foot}}`, juga HTML yang membuat header dan footer berulang pada blog.

Templat standar berisikan ekspresi handlebars `{{{body}}}` untuk menotasikan konten dari templat baku di mana akan ditampilkan.

Kemudian halaman templat ini memiliki `{{!< default}}` pada baris paling pertamanya yang berfungsi untuk mencirikan bahwa mereka merupakan turunan dari templat baku. Lalu kontennya harus ditempatkan di berkas default.hbs di mana `{{{body}}}` didefinisikan.

### index.hbs

Berkas ini merupakan templat untuk halaman utama dan merupakan turunan dari <code class="path">default.hbs</code>. Halaman utama memuat sebuah daftar artikel yang harus ditampilkan dan <code class="path">index.hbs</code> mendefinisikan bagaimana setiap artikel tersebut harus ditampilkan.

Dalam Casper (tema standar saat ini), halaman utama mempunyai sebuah header besar yang menggunakan pengaturan global `@blog` global untuk mencetak logo dari blog, judul dan deskripsi. Header tersebut diikuti oleh eksperi pembantu `{{#foreach}}` untuk menampilkan sebuah daftar dari artikel-artikel terakhir.

### post.hbs

Berkas ini adalah templat untuk artikel tunggal yang juga merupakan turunan dari <code class="path">default.hbs</code>.

Dalam tema baku Casper, templat untuk artikel tunggal memiliki header tersendiri dan juga menggunakan pengaturan `@blog` global. Lalu dia juga menggunakan ekspresi pengakses data `{{#post}}` untuk mencetak semua rincian artikel.

### page.hbs

Anda dapat menyediakan sebuah templat statis untuk halaman statis jika dinginkan. Apabila tema yang Anda buat tidak memiliki templat <code class="path">page.hbs</code>, Ghost akan menggunakan templat standar <code class="path">post.hbs</code> untuk halaman.

Halaman mempunyai tipe data yang sama dengan artikel, hanya saja halaman tidak ditampilkan pada daftar artikel.

### error.hbs

Secara opsional, Anda juga dapat menyediakan templat galat untuk galat 404 atau 500. Jika tema buatan Anda tidak menyediakan <code class="path">error.hbs</code>, maka Ghost akan menggunakan templat standar.

Untuk melihat bagaimana mengkases data tentang sebuah galat, lihatlah templat galat standar dari Ghost yang terletak di <code class="path">/core/server/views/user-error.hbs</code>

### Mempercantik Artikel & Pratampil

When building themes for Ghost please consider the scope of your classes, and in particular your IDs, to try to avoid clashes between your main styling and your post styling. You never know when a class name or in particular an ID (because of the auto-generation of IDs for headings) will get used inside a post. Therefore it's best to always scope things to a particular part of the page. E.g. #my-id could match things you don't expect whereas #themename-my-id would be safer.

Ghost aims to offer a realistic preview of your posts as part of the split screen editor, but in order to do this we must load a theme's custom styling for a post in the admin. This feature is not yet implemented, but we highly recommend keeping your post styles in a separate file (post.css) from other styles for your theme (style.css) so that you will quickly be able to take advantage of this feature in the future.

## Creating Your Own Theme <a id="create-your-own"></a>

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

You can use `{{tags}}` to output a customisable list of tags, this can also be done by using a block expression:

```
<ul>
    {{#foreach tags}}
        <li>{{name}}</li>
    {{/foreach}}
</ul>
```

See the section on the [`{{tags}}`](#tags-helper) helper for details of the options.

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

----

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

----

### <code>content</code> <a id="content-helper"></a>

*   Helper type: output
*   Options: `words` (number), `characters` (number) [defaults to show all]

`{{content}}` is a very simple helper used for outputting post content. It makes sure that your HTML gets output correctly.

You can limit the amount of HTML content to output by passing one of the options:

`{{content words="100"}}` will output just 100 words of HTML with correctly matched tags.

----

### <code>excerpt</code> <a id="excerpt-helper"></a>

*   Helper type: output
*   Options: `words` (number), `characters` (number) [defaults to 50 words]

`{{excerpt}}` outputs content but strips all HTML. This is useful for creating excerpts of posts.

You can limit the amount of text to output by passing one of the options:

`{{excerpt characters="140"}}` will output 140 characters of text.

----

### <code>tags</code> <a id="tags-helper"></a>

*   Helper type: output
*   Options: `separator` (string, default ", "), `suffix` (string), `prefix` (string)

`{{tags}}` is a formatting helper for outputting a list of tags for a particular post. It defaults to a comma-separated list:

```
// outputs something like 'my-tag, my-other-tag, more-tagging'
{{tags}}
```

 but you can customise the separator between tags:

```
// outputs something like 'my-tag | my-other-tag | more tagging'
{{tags separator=" | "}}
```

As well as passing an optional prefix or suffix.

```
// outputs something like 'Tagged in: my-tag | my-other-tag | more tagging'
{{tags separator=" | " prefix="Tagged in:"}}
```

----

### <code>date</code> <a id="date-helper"></a>

*   Helper type: output
*   Options: `format` (date format, default “MMM Do, YYYY”), `timeago` (boolean)

`{{date}}` is a formatting helper for outputting dates in various format. You can either pass it a date and a format string to be used to output the date like so:

```
// outputs something like 'July 11, 2014'
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

----

### <code>encode</code> <a id="encode-helper"></a>

*   Helper type: output
*   Options: none

`{{encode}}` is a simple output helper which will encode a given string so that it can be used in a URL.

The most obvious example of where this is useful is shown in Casper's <code class="path">post.hbs</code>, for outputting a twitter share link:

```
<a class="icon-twitter" href="http://twitter.com/share?text={{encode title}}&url={{url absolute="true"}}"
    onclick="window.open(this.href, 'twitter-share', 'width=550,height=235');return false;">
    <span class="hidden">Twitter</span>
</a>
```

Without using the `{{encode}}` helper on the post's title, the spaces and other punctuation in the title would not be handled correctly.

----

### <code>url</code> <a id="url-helper"></a>

*   Helper type: output
*   Options: `absolute`

`{{url}}` outputs the relative url for a post when inside the post context.

You can force the url helper to output an absolute url by using the absolute option, E.g. `{{url absolute="true"}}`

----

### <code>asset</code> <a id="asset-helper"></a>

* Helper type: output
* Options: none

The `{{asset}}` helper exists to take the pain out of asset management. Firstly, it ensures that the relative path to an asset is always correct, regardless of how Ghost is installed. So if Ghost is installed in a subdirectory, the paths to the files are still correct, without having to use absolute URLs.

Secondly, it allows assets to be cached. All assets are served with a `?v=#######` query string which currently changes when Ghost is restarted and ensures that assets can be cache busted when necessary.

Thirdly, it provides stability for theme developers so that as Ghost's asset handling and management evolves and matures, theme developers should not need to make further adjustments to their themes as long as they are using the asset helper.

Finally, it imposes a little bit of structure on themes by requiring an <code class="path">asset</code> folder, meaning that Ghost knows where the assets are, and theme installing, switching live reloading will be easier in future.

#### Usage

To use the `{{asset}}` helper to output the path for an asset, simply provide it with the path for the asset you want to load, relative to the <code class="path">asset</code> folder.

```
// will output something like: <link rel="stylesheet" type="text/css" href="/path/to/blog/assets/css/style.css?v=1234567" />
<link rel="stylesheet" type="text/css" href="{{asset "css/style.css"}}" />
```

```
// will output something like: <script type="text/javascript" src="/path/to/blog/assets/js/index.js?v=1234567"></script>
<script type="text/javascript" src="{{asset "js/index.js"}}"></script>
```

#### Favicons

Favicons are a slight exception to the rule on how to use the asset helper, because the browser always requests one regardless of whether it is defined in the theme, and Ghost aims to serve this request as fast as possible.

By default `{{asset "favicon.ico"}}` works exactly the same as the browser's default request, serving Ghost's default favicon from the shared folder.
This means it doesn't have to look up what theme the blog is using or where that theme lives before serving the request.

If you would like to use a custom favicon, you can do so by putting a <code class="path">favicon.ico</code> in your theme's asset folder and using the asset helper with a leading slash:

`{{asset "/favicon.ico"}}`

This trailing slash tells Ghost not to serve the default favicon, but to serve it from the themes asset folder.

----

###  <code>pagination</code> <a href="pagination-helper"></a>

*   Helper type: output, template-driven
*   Options: none (coming soon)

`{{pagination}}` is a template driven helper which outputs HTML for 'newer posts' and 'older posts' links if they are available and also says which page you are on.

You can override the HTML output by the pagination helper by placing a file called <code class="path">pagination.hbs</code> inside of <code class="path">content/themes/your-theme/partials</code>.

----

### <code>body_class</code> <a id="bodyclass-helper"></a>

*   Helper type: output
*   Options: none

`{{body_class}}` – outputs classes intended for the `<body>` tag in <code class="path">default.hbs</code>, useful for targeting specific pages with styles.

----

### <code>post_class</code> <a id="postclass-helper"></a>

*   Helper type: output
*   Options: none

`{{post_class}}` – outputs classes intended your post container, useful for targeting posts with styles.

----

### <code>ghost_head</code> <a id="ghosthead-helper"></a>

*   Helper type: output
*   Options: none

`{{ghost_head}}` – belongs just before the `</head>` tag in <code class="path">default.hbs</code>, used for outputting meta tags, scripts and styles. Will be hookable.

----

### <code>ghost_foot</code> <a id="ghostfoot-helper"></a>

*   Helper type: output
*   Options: none

`{{ghost_foot}}` – belongs just before the `</body>` tag in <code class="path">default.hbs</code>, used for outputting scripts. Outputs jquery by default. Will be hookable.

----

### <code>meta_title</code> <a id="metatitle-helper"></a>

*   Helper type: output
*   Options: none

`{{meta_title}}` – outputs the post title on posts, or otherwise the blog title. Used for outputting title tags in the `</head>` block. E.g. `<title>{{meta_title}}</title>`. Will be hookable.

----

### <code>meta_description</code> <a id="metatitledescription-helper"></a>

*   Helper type: output
*   Options: none

`{{meta_description}}` - outputs nothing (yet) on posts, outputs the blog description on all other pages. Used for outputing the description meta tag. E.g. `<meta name="description" content="{{meta_description}}" />`. Will be hookable.


## Troubleshooting Themes <a id="troubleshooting"></a>

#### 1. I see Error: Failed to lookup view "index" or "post"

Check that your theme folder contains a correctly named index.hbs and post.hbs as these are required

{% endraw %}