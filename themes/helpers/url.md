---
layout: themes
meta_title: Theme helper reference - Ghost Docs
meta_description: Ghost theme helper API, helper reference documentation
chapter: themes
section: helpers
permalink: /themes/helpers/url/
canonical: http://themes.ghost.org/v5.2/docs/url
redirectToCanonical: true
---

{% raw %}

# url

 * Type: Output
 * Parameters: none
 * Attributes: `absolute` (boolean)

<!--
 * Origin: Ghost
 * Required: No
 * Context: All
-->

### Description

`{{url}}` outputs the relative url for a post when inside the post context.

You can force the url helper to output an absolute url by using the absolute option, E.g. `{{url absolute="true"}}`


{% endraw %}