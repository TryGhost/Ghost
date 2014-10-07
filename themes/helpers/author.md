---
layout: themes
meta_title: Theme helper reference - Ghost Docs
meta_description: Ghost theme helper API, helper reference documentation
chapter: themes
section: helpers
permalink: /themes/helpers/author/
canonical: http://themes.ghost.org/v5.2/docs/author
redirectToCanonical: true
---

{% raw %}

# author

 * Type: Output or Block
 * Parameters: none
 * Attributes: `autolink` (boolean, output only)

<!--
  * Origin: Ghost
  * Context: Post
  * Required: No
-->

### Description

The author helper can be used as either an output or block helper, and provides different ways to access and output the
information about a post author.

### Usage

Used as an output helper, `{{author}}` will output the author's name wrapped in an `<a>` tag with a link to the
author's page listing all the posts authored by them.


Used as a block helper, it is possible to get access to all of the properties available on an author (or user) object:

```
{{#author}}
    <h3>{{name}}</h3>
    <p>{{bio}}</p>
{{/author}}
```

{% endraw %}