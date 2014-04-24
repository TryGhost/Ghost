---
layout: themes
meta_title: How to Make Ghost Themes - Ghost Docs
meta_description: An in depth guide to making themes for the Ghost blogging platform. Everything you need to know to build themes for Ghost.
heading: Ghost Themes
subheading: Get started creating your own themes for Ghost
chapter: themes
---

{% raw %}

## Switching Theme <a id="switching-theme"></a>

Ghost themes live in <code class="path">content/themes/</code>

If you want to use a different theme to the default Casper theme, check out the custom themes on our [marketplace gallery](http://marketplace.ghost.org/). Download the theme package of your choice, extract it and place it in <code class="path">content/themes</code> alongside Casper.

If you want to make your own, we recommend copying and renaming the casper directory & editing the templates to look and work how you want.

To switch to your newly added theme:

1.  Restart Ghost. At the moment, Ghost won't notice that you've added a new folder to <code class="path">content/themes</code> so you'll need to restart it
2.  Login to your Ghost admin, and navigate to <code class="path">/ghost/settings/general/</code>
3.  Select your Theme name in the 'Theme' options dropdown
4.  Click 'Save'
5.  Visit the frontend of your blog and marvel at the new theme

<p class="note">**Note:** If you're on the Ghost Hosted Service, rather than a self-install, to switch theme you'll need to go to your <a href="https://ghost.org/blogs/">blog management</a> page and click on "edit" beside the name of your blog.</p>


##  What is Handlebars? <a id="what-is-handlebars"></a>

[Handlebars](http://handlebarsjs.com/) is the templating language used by Ghost.

> Handlebars provides the power necessary to let you build semantic templates effectively with no frustration.

If you're looking to get started writing your own theme, you'll probably want to get yourself familiar with handlebars syntax first. Have a read of the [handlebars documentation](http://handlebarsjs.com/expressions.html), or checkout this [tutorial from Treehouse](http://blog.teamtreehouse.com/getting-started-with-handlebars-js) – you can skip the first section on installation and usage (we’ve done that bit for you) and get stuck in with ‘Basic Expressions’.

Ghost also makes use of an additional library called `express-hbs` which adds some [additional features](https://github.com/barc/express-hbs#syntax) to handlebars which Ghost makes heavy use of, such as [layouts](#default-layout) and [partials](#partials).

## About Ghost themes <a id="about"></a>

Ghost themes are intended to be simple to build and maintain. They advocate strong separation between templates (the HTML) and any business logic (JavaScript). Handlebars is (almost) logicless and enforces this separation, providing the helper mechanism so that business logic for displaying content remains separate and self-contained. This separation lends itself towards easier collaboration between designers and developers when building themes.

Handlebars templates are hierarchical (one template can extend another template) and also support partial templates. Ghost uses these features to reduce code duplication and keep individual templates focused on doing a single job, and doing it well. A well structured theme will be easy to maintain and keeping components separated makes them easier to reuse between themes.

We really hope you'll enjoy our approach to theming.

## The File Structure of a Ghost Theme <a id="file-structure"></a>

The recommended file structure is:

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
└── package.json [will be required from 0.6]
```

For the time being there is no requirement that <code class="path">default.hbs</code> or any folders exist. It is recommended that you keep your assets inside of an <code class="path">assets</code> folder, and make use of the [`{{asset}}` helper](#asset-helper) for serving css, js, image, font and other asset files.

<code class="path">index.hbs</code> and <code class="path">post.hbs</code> are required – Ghost will not work if these two templates are not present.

*Note:* While edits to existing files are generated on the fly, you will need to restart Ghost each time you add or remove a file from the theme directory for it to be recognised and used.

### Partials <a id="partials"></a>

You can also optionally add a <code class="path">partials</code> directory to your theme. This should include any part templates you want to use across your blog, for example <code class="path">list-post.hbs</code> might include your template for outputting a single post in a list, which might then be used on the homepage, and in future archive & tag pages. To output the <code class="path">list-post.hbs</code> example you would use `{{> list-post}}`. <code class="path">partials</code> is also where you can put templates to override the built-in templates used by certain helpers like pagination. Including a <code class="path">pagination.hbs</code> file inside <code class="path">partials</code> will let you specify your own HTML for pagination.

### default.hbs <a id="default-layout"></a>

This is the default layout, or base template which contains all the boring bits of HTML that have to appear on every page – the `<html>`, `<head>` and `<body>` tags along with the `{{ghost_head}}` and `{{ghost_foot}}` helpers, as well as any HTML which makes up a repeated header and footer for the blog.

The default template contains the handlebars expression `{{{body}}}` to denote where the content from templates which extend the default template goes.

Page templates then have `{{!< default}}` as the very first line to specify that they extend the default template, and that their content should be placed into the place in default.hbs where `{{{body}}}` is defined.

### index.hbs

This is the template for the homepage, and extends <code class="path">default.hbs</code>. The homepage gets passed a list of posts which should be displayed, and <code class="path">index.hbs</code> defines how each posts should be displayed.

In Casper (the current default theme), the homepage has a large header which uses `@blog` global settings to output the blog logo, title and description. This is followed by using the `{{#foreach}}` helper to output a list of the latest posts.

### post.hbs

This is the template for a single post, which also extends <code class="path">default.hbs</code>.

In Casper (the current default theme), the single post template has it's own header, also using `@blog` global settings and then uses the `{{#post}}` data accessor to output all of the post details.

### page.hbs

You can optionally provide a page template for static pages. If your theme doesn't have a <code class="path">page.hbs</code> template, Ghost will use the standard <code class="path">post.hbs</code> template for pages.

Pages have exactly the same data available as a post, they simply don't appear in the list of posts.

If you want to have a custom template for a specific page you can do so by creating a template with the name <code class="path">page-{{slug}}.hbs</code>. For example if you have a page called 'About' that lives at <code class="path">/about/</code> then you can add a template called <code class="path">page-about.hbs</code> and this template will be used to render only the about page.

### tag.hbs

You can optionally provide a tag template for the tag listing pages. If your theme doesn't have a <code class="path">tag.hbs</code> template, Ghost will use the standard <code class="path">index.hbs</code> template for tag pages.

Tag pages have access to both a tag object, a list of posts and pagination properties.

### error.hbs

You can optionally provide an error template for any 404 or 500 errors. If your theme doesn't provide an <code class="path">error.hbs</code> Ghost will use its default.

To see how to access the data about an error, take a look at Ghost's default error template which is located in <code class="path">/core/server/views/user-error.hbs</code>

### package.json

Package.json is a format borrowed from [npm](https://www.npmjs.org/doc/json.html). Ghost currently looks for a `name` and `version` field.
We highly recommend adding an `author` and `description` field. The fields that Ghost requires will change as Ghost evolves, but for now the following is enough to make Ghost happy:

```
{
  "name": "mytheme",
  "version": "0.1.0"
}
```

### Post styling & previewing

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
*   Options: `tag` (comma separated list)

`{{has}}` intends to allow theme developers to ask questions about the current context and provide more flexibility for creating different post layouts in Ghost.

Currently, the `{{has}}` helper only allows you to determine whether a tag is present on a post:

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


## Troubleshooting Themes <a id="troubleshooting"></a>

#### 1. I see Error: Failed to lookup view "index" or "post"

Check that your theme folder contains a correctly named index.hbs and post.hbs as these are required

{% endraw %}
