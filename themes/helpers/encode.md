---
layout: themes
meta_title: Theme helper reference - Ghost Docs
meta_description: Ghost theme helper API, helper reference documentation
chapter: themes
section: helpers
permalink: /themes/helpers/encode/
canonical: http://themes.ghost.org/v5.2/docs/encode
redirectToCanonical: true
---

{% raw %}

# encode

 * Type: Output
 * Parameters: value to encode (string)
 * Attributes: none

<!--
 * Origin: Ghost
 * Required: No
 * Context: All
 -->

### Description

`{{encode}}` is a simple output helper which will encode a given string so that it can be used in a URL.

The most obvious example of where this is useful is shown in Casper's <code class="path">post.hbs</code>, for outputting a twitter share link:

```
<a class="icon-twitter" href="http://twitter.com/share?text={{encode title}}&url={{url absolute="true"}}"
    onclick="window.open(this.href, 'twitter-share', 'width=550,height=235');return false;">
    <span class="hidden">Twitter</span>
</a>
```

Without using the `{{encode}}` helper on the post's title, the spaces and other punctuation in the title would not be handled correctly.

{% endraw %}