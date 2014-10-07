---
layout: themes
meta_title: Theme helper reference - Ghost Docs
meta_description: Ghost theme helper API, helper reference documentation
chapter: themes
section: helpers
permalink: /themes/helpers/excerpt/
canonical: http://themes.ghost.org/v5.2/docs/excerpt
redirectToCanonical: true
---

{% raw %}

# excerpt

 * Type: Output
 * Parameters: none
 * Attributes: `words` (number), `characters` (number) [defaults to 50 words]

<!--
 * Origin: Ghost
 * Required: No
 * Context: All
 -->

### Description

`{{excerpt}}` outputs content but strips all HTML. This is useful for creating excerpts of posts.

You can limit the amount of text to output by passing one of the options:

`{{excerpt characters="140"}}` will output 140 characters of text.

{% endraw %}