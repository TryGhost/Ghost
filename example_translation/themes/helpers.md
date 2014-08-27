---
lang: example_translation
layout: themes
meta_title: How to Make Ghost Themes - Ghost Docs
meta_description: An in depth guide to making themes for the Ghost blogging platform. Everything you need to know to build themes for Ghost.
heading: Theme Documentation
subheading: The complete guide to creating custom themes for Ghost
chapter: themes
section: helpers
permalink: /example_translation/themes/helpers/
prev_section: structure
next_section: troubleshooting
---

{% raw %}


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

#### `@first` &amp; `@last`

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

#### `@even` &amp; `@odd`

The following example adds a class of even or odd, which could be used for zebra striping content:

```
{{#foreach posts}}
        <div class="{{#if @even}}even{{else}}odd{{/if}}">{{title}}</div>
{{/foreach}}
```

#### `@rowStart` &amp; `@rowEnd`

The following example shows you how to pass in a column argument so that you can set properties for the first and last element in a row. This allows for outputting content in a grid layout.

```
{{#foreach posts columns=3}}
    <li class="{{#if @rowStart}}first{{/if}}{{#if @rowEnd}}last{{/if}}">{{title}}</li>
{{/foreach}}
```

----

### <code>has</code> <a id="has-helper"></a>

*   Helper type: block
*   Options: `tag` (comma separated list), `author` (comma separated list)

`{{has}}` intends to allow theme developers to ask questions about the current context and provide more flexibility for creating different post layouts in Ghost.

Currently, the `{{has}}` helper only allows you to ask questions about a post's author or tags:


To determine if a post has a particular author:

```
{{#post}}
    {{#has author="Joe Bloggs"}}
        ...do something if the author is Joe Bloggs...
    {{/has}}
{{/post}}
```

To determine if a post has a particular tag:


```
{{#post}}
    {{#has tag="photo"}}
        ...do something if this post has a tag of photo...
    {{else}}
        ...do something if this posts doesn't have a tag of photo...
    {{/has}}
{{/post}}
```

You can also supply a comma-separated list of tags, which is the equivalent of an 'or' query, asking if a post has any one of the given tags:

```
{{#has tag="photo, video, audio"}}
    ...do something if this post has a tag of photo or video or audio...
{{else}}
    ...do something with other posts...
{{/has}}
```

If you're interested in negating the query, i.e. determining if a post does **not** have a particular tag, this is also possible.
Handlebars has a feature which is available with all block helpers that allows you to do the inverse of the helper by using `^` instead of `#` to start the helper:

```
{{^has tag="photo"}}
    ...do something if this post does **not** have a tag of photo...
{{else}}
    ...do something if this posts does have a tag of photo...
{{/has}}
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

`{{tags}}` is a formatting helper for outputting a linked list of tags for a particular post. It defaults to a comma-separated list:

```
// outputs something like 'my-tag, my-other-tag, more-tagging' where each tag is linked to its own tag page
{{tags}}
```

 but you can customise the separator between tags:

```
// outputs something like 'my-tag | my-other-tag | more tagging'
{{tags separator=" | "}}
```

as well as passing an optional prefix or suffix.

```
// outputs something like 'Tagged in: my-tag | my-other-tag | more tagging'
{{tags separator=" | " prefix="Tagged in:"}}
```

You can use HTML in the separator, prefix and suffix arguments:

```
// outputs something like 'my-tag • my-other-tag • more tagging'
{{tags separator=" &bullet; "}}
```

If you don't want your list of tags to be automatically linked to their tag pages, you can turn this off:

```
// outputs tags without an <a> wrapped around them
{{tags autolink="false"}}
```

----

### <code>date</code> <a id="date-helper"></a>

*   Helper type: output
*   Options: `empty` (string), `singular` (string), `plural` (string)

`{{plural}}` is a formatting helper for outputting strings which change depending on whether a number is singular or plural.

```
{{plural pagination.total empty='No posts' singular='% post' plural='% posts'}}
```

The most common usecase for the plural helper is outputting information about how many posts there are in total in a collection. For example, themes have access to `pagination.total` on the homepage, a tag page or an author page.

----

### <code>plural</code> <a id="plural-helper"></a>

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

Finally, it imposes a little bit of structure on themes by requiring an <code class="path">assets</code> folder, meaning that Ghost knows where the assets are, and theme installing, switching live reloading will be easier in future.

#### Usage

To use the `{{asset}}` helper to output the path for an asset, simply provide it with the path for the asset you want to load, relative to the <code class="path">assets</code> folder.

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

If you would like to use a custom favicon, you can do so by putting a <code class="path">favicon.ico</code> in your theme's <code class="path">assets</code> folder and using the asset helper with a leading slash:

`{{asset "/favicon.ico"}}`

This trailing slash tells Ghost not to serve the default favicon, but to serve it from the themes <code class="path">assets</code> folder.

----

###  <code>pagination</code> <a href="pagination-helper"></a>

*   Helper type: output, template-driven
*   Options: none (coming soon)

`{{pagination}}` is a template driven helper which outputs HTML for 'newer posts' and 'older posts' links if they are available and also says which page you are on.

You can override the HTML output by the pagination helper by placing a file called <code class="path">pagination.hbs</code> inside of <code class="path">content/themes/your-theme/partials</code>.

----

###  <code>log</code> <a href="log-helper"></a>
*   Helper type: output
*   Options: none

`{{log}}` is a helper which is part of Handlebars, but until Ghost 0.4.2 this hasn't done anything useful.

When running Ghost in development mode, you can now use the `{{log}}` helper to output debug messages to the server console. In particular you can get handlebars to output the details of objects or the current context

For example, to output  the full 'context' that handlebars currently has access to:

`{{log this}}`

Or to just log each post in the loop:

```
{{#foreach posts}}
   {{log post}}
{{/foreach}}
```

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


{% endraw %}