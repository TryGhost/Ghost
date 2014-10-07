---
layout: themes
meta_title: Theme helper reference - Ghost Docs
meta_description: Ghost theme helper API, helper reference documentation
chapter: themes
section: helpers
permalink: /themes/helpers/content/
canonical: http://themes.ghost.org/v5.2/docs/content
redirectToCanonical: true
---

{% raw %}

# content

 * Type: Output
 * Parameters: none
 * Attributes: `words` (number), `characters` (number) [defaults to show all]

<!--
 * Origin: Ghost
 * Required: No
 * Context: Post
 -->

### Description

`{{content}}` is a very simple helper used for outputting post content. It makes sure that your HTML gets output correctly.

You can limit the amount of HTML content to output by passing one of the options:

`{{content words="100"}}` will output just 100 words of HTML with correctly matched tags.



{% endraw %}