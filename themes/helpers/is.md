---
layout: themes
meta_title: Theme helper reference - Ghost Docs
meta_description: Ghost theme helper API, helper reference documentation
chapter: themes
section: helpers
permalink: /themes/helpers/is/
canonical: http://themes.ghost.org/v5.2/docs/is
redirectToCanonical: true
---

{% raw %}

# is

 * Type: Block
 * Parameters: contexts to check (string, comma-separated)
 * Attributes: none


<!--
  * Origin: Ghost
  * Required: No
  * Context: All
-->

### Description

The `{{#is}}` helper allows you to check the context of the current route, i.e. is it the home page, or a post, or a
tag listing page.

### Usage

The `is` helper takes a single parameter of a comma-separated list containing the contexts to check for. Similar to the
`has` helper, the comma behaves as an `or` statement, with `and` being achieved by nesting helpers.

```
{{#is "post, page"}}
   ... content to render if the current route reqpresents a post or a page ...
{{/is}}
```

As with all block helpers, it is possible to use an else statement:

```
{{#is "home"}}
  ... output something special for the home page ...
{{else}}
  ... output something different on all other pages ...
{{/is}}
```

If you only want the reverse, or negation, you can use the `^` character:

```
{{^is "paged"}}
 ...if this is *not* a 2nd, 3rd etc page of a list...
{{/is}}
```

### Contexts

The following contexts are supported:

* **home** - true only on the home page
* **index** - true for the main post listing, including the home page
* **post** - true for any individual post page, where the post is not a static page
* **page** - true for any static page
* **tag** - true for any page of the lag list
* **author** - true for any page of the author list
* **paged** - true if this is page 2, page 3 of a list, but not on the first page.

{% endraw %}