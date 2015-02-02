---
lang: vi
layout: themes
meta_title: How to Make Ghost Themes - Ghost Docs
meta_description: An in depth guide to making themes for the Ghost blogging platform. Everything you need to know to build themes for Ghost.
heading: Theme Documentation
subheading: The complete guide to creating custom themes for Ghost
chapter: themes
section: structure
permalink: /vi/themes/structure/
prev_section: handlebars
next_section: helpers
---

{% raw %}

## The File Structure of a Ghost Theme

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
└── package.json [will be required]
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

### home.hbs

You can optionally provide a special template for the homepage. This template will only be used to render `/`, and not the subsequent pages like `/page/2/`.

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

### author.hbs

You can optionally provide an author template for the author listing pages. If your theme doesn't have an <code class="path">author.hbs</code> template, Ghost will use the standard <code class="path">index.hbs</code> template for author pages.

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


{% endraw %}
