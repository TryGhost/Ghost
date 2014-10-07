---
layout: themes
meta_title: Theme helper reference - Ghost Docs
meta_description: Ghost theme helper API, helper reference documentation
chapter: themes
section: helpers
permalink: /themes/helpers/has/
canonical: http://themes.ghost.org/v5.2/docs/has
redirectToCanonical: true
---

{% raw %}

# has

 * Type: Block
 * Parameters: none
 * Attributes: `tag` (comma separated list), `author` (comma separated list)


<!--
* Origin: Ghost
* Required: No
* Context: All
-->

### Description

`{{has}}` intends to allow theme developers to ask questions about the current context and provide more flexibility for creating different post layouts in Ghost.

### Usage

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

{% endraw %}