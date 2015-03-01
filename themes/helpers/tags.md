---
layout: themes
meta_title: Theme helper reference - Ghost Docs
meta_description: Ghost theme helper API, helper reference documentation
chapter: themes
section: helpers
permalink: /themes/helpers/tags/
canonical: http://themes.ghost.org/v5.2/docs/tags
redirectToCanonical: true
---

{% raw %}

# tags

 * Type: Output
 * Parameters: none
 * Attributes: `separator` (string, default ", "), `suffix` (string), `prefix` (string), `autolink` (boolean)

<!--
* Origin: Ghost
* Required: No
* Context: Post
-->

### Description

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

{% endraw %}