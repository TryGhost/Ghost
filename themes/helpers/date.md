---
layout: themes
meta_title: Theme helper reference - Ghost Docs
meta_description: Ghost theme helper API, helper reference documentation
chapter: themes
section: helpers
permalink: /themes/helpers/date/
---

{% raw %}

# date

*   Helper type: output
*   Options: `empty` (string), `singular` (string), `plural` (string)

`{{plural}}` is a formatting helper for outputting strings which change depending on whether a number is singular or plural.

```
{{plural pagination.total empty='No posts' singular='% post' plural='% posts'}}
```

The most common usecase for the plural helper is outputting information about how many posts there are in total in a collection. For example, themes have access to `pagination.total` on the homepage, a tag page or an author page.

{% endraw %}