---
lang: zh_TW
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


##  What is Handlebars? <a id="what-is-handlebars"></a>

[Handlebars](http://handlebarsjs.com/) is the templating language used by Ghost.

> Handlebars provides the power necessary to let you build semantic templates effectively with no frustration.

If you're looking to get started writing your own theme, you'll probably want to get yourself familiar with handlebars syntax first. Have a read of the [handlebars documentation](http://handlebarsjs.com/expressions.html), or checkout this [tutorial from Treehouse](http://blog.teamtreehouse.com/getting-started-with-handlebars-js) – you can skip the first section on installation and usage (we’ve done that bit for you) and get stuck in with ‘Basic Expressions’.

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
```

For the time being there is no requirement that default.hbs or any of the folders exist. <code class="path">index.hbs</code> and <code class="path">post.hbs</code> are required – Ghost will not work if these two templates are not present. <code class="path">partials</code> is a special directory. This should include any part templates you want to use across your blog, for example <code class="path">list-post.hbs</code> might include your template for outputting a single post in a list, which might then be used on the homepage, and in future archive & tag pages. <code class="path">partials</code> is also where you can put templates to override the built-in templates used by certain helpers like pagination. Including a <code class="path">pagination.hbs</code> file inside <code class="path">partials</code> will let you specify your own HTML for pagination.

### default.hbs

This is the base template which contains all the boring bits of HTML that have to appear on every page – the `<html>`, `<head>` and `<body>` tags along with the `{{ghost_head}}` and `{{ghost_foot}}` helpers, as well as any HTML which makes up a repeated header and footer for the blog.

The default template contains the handlebars expression `{{{body}}}` to denote where the content from templates which extend the default template goes.

Page templates then have `{{!< default}}` as the very first line to specify that they extend the default template, and that their content should be placed into the place in default.hbs where `{{{body}}}` is defined.

### index.hbs

This is the template for the homepage, and extends <code class="path">default.hbs</code>. The homepage gets passed a list of posts which should be displayed, and <code class="path">index.hbs</code> defines how each posts should be displayed.

In Casper (the current default theme), the homepage has a large header which uses `@blog` global settings to output the blog logo, title and description. This is followed by using the `{{#foreach}}` helper to output a list of the latest posts.

### post.hbs

This is the template for a single post, which also extends <code class="path">default.hbs</code>.

In Casper (the current default theme), the single post template has it's own header, also using `@blog` global settings and then uses the `{{#post}}` data accessor to output all of the post details.

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

You can use `{{tags}}` to output a comma separated list of tags, or if you prefer, specify your own separator `{{tags separator=""}}`

This can also be done by using a block expression:

```
<ul>
    {{#foreach tags}}
        <li>{{name}}</li>
    {{/foreach}}
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