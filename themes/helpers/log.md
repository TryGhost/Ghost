---
layout: themes
meta_title: Theme helper reference - Ghost Docs
meta_description: Ghost theme helper API, helper reference documentation
chapter: themes
section: helpers
permalink: /themes/helpers/log/
canonical: http://themes.ghost.org/v5.2/docs/log
redirectToCanonical: true
---

{% raw %}

# log

 * Type: Output
 * Parameters: value to output (any)
 * Attributes: none


<!--
  * Origin: Handlebars, Ghost
  * Required: No
  * Context: All
-->


### Description

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

{% endraw %}