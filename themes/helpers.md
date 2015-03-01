---
layout: themes
meta_title: How to Make Ghost Themes - Ghost Docs
meta_description: An in depth guide to making themes for the Ghost blogging platform. Everything you need to know to build themes for Ghost.
chapter: themes
section: helpers
permalink: /themes/helpers/
prev_section: structure
next_section: changelog
canonical: http://themes.ghost.org/v5.2/docs/helpers
redirectToCanonical: true

---

{% raw %}

# Helper Reference

Ghost has a number of built in helpers which give you the tools you need to build your theme. Helpers are classified into two types: block and output helpers.

**[Block Helpers](http://handlebarsjs.com/block_helpers.html)** have a start and end tag E.g. `{{#foreach}}{{/foreach}}`. The context between the tags changes and these helpers may also provide you with additional properties which you can access with the `@` symbol.

**Output Helpers** look much the same as the expressions used for outputting data e.g. `{{content}}`. They perform useful operations on the data before outputting it, and often provide you with options for how to format the data. Some output helpers use templates to format the data with HTML a bit like partials. Some output helpers are also block helpers, providing a variation of their functionality.


## Helper Listings

The following listings group the various helpers together by various properties to make it easier to find a helper
that may be what you need!


### All
[{{foreach}}](/themes/helpers/foreach/), [{{has}}](/themes/helpers/has/), [{{content}}](/themes/helpers/content/),
[{{excerpt}}](/themes/helpers/excerpt/), [{{tags}}](/themes/helpers/tags/), [{{author}}](/themes/helpers/author/),
[{{url}}](/themes/helpers/url/), [{{date}}](/themes/helpers/date/), [{{plural}}](/themes/helpers/plural/),
[{{encode}}](/themes/helpers/encode/), [{{asset}}](/themes/helpers/asset/),
[{{body_class}}](/themes/helpers/body_class/), [{{post_class}}](/themes/helpers/post_class/),
[{{ghost_head}}](/themes/helpers/ghost_head/), [{{ghost_foot}}](/themes/helpers/ghost_foot/),
[{{meta_title}}](/themes/helpers/meta_title/), [{{meta_description}}](/themes/helpers/meta_description/),
[{{log}}](/themes/helpers/log/)

### Required

[{{asset}}](/themes/helpers/asset/), [{{body_class}}](/themes/helpers/body_class/),
[{{post_class}}](/themes/helpers/post_class/), [{{ghost_head}}](/themes/helpers/ghost_head/),
[{{ghost_foot}}](/themes/helpers/ghost_foot/)

### Debugging

[{{log}}](/themes/helpers/log/)


{% endraw %}