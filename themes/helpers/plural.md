---
layout: themes
meta_title: Theme helper reference - Ghost Docs
meta_description: Ghost theme helper API, helper reference documentation
chapter: themes
section: helpers
permalink: /themes/helpers/plural/
canonical: http://themes.ghost.org/v5.2/docs/plural
redirectToCanonical: true
---

{% raw %}

# plural

 * Type: Output, Formatting
 * Parameters: value to format (number)
 * Attributes:  `empty` (string), `singular` (string), `plural` (string)

<!--
 * Origin: Ghost
 * Required: No
 * Context: All
 -->

### Description

`{{plural}}` is a formatting helper for outputting strings which change depending on whether a number is singular or plural.

The most common use case for the plural helper is outputting information about how many posts there are in total in a collection. For example, themes have access to `pagination.total` on the homepage, a tag page or an author page.

### Usage

```
{{plural pagination.total empty='No posts' singular='% post' plural='% posts'}}
```











{% endraw %}