---
lang: example_translation
layout: themes
meta_title: How to Make Ghost Themes - Ghost Docs
meta_description: An in depth guide to making themes for the Ghost blogging platform. Everything you need to know to build themes for Ghost.
heading: Theme Documentation
subheading: The complete guide to creating custom themes for Ghost
chapter: themes
section: handlebars
permalink: /example_translation/themes/handlebars/
prev_section: themes
next_section: structure
---

{% raw %}

##  What is Handlebars?

[Handlebars](http://handlebarsjs.com/) is the templating language used by Ghost.

> Handlebars provides the power necessary to let you build semantic templates effectively with no frustration.

If you're looking to get started writing your own theme, you'll probably want to get yourself familiar with handlebars syntax first. Have a read of the [handlebars documentation](http://handlebarsjs.com/expressions.html), or checkout this [tutorial from Treehouse](http://blog.teamtreehouse.com/getting-started-with-handlebars-js) – you can skip the first section on installation and usage (we’ve done that bit for you) and get stuck in with ‘Basic Expressions’.

Ghost also makes use of an additional library called `express-hbs` which adds some [additional features](https://github.com/barc/express-hbs#syntax) to handlebars which Ghost makes heavy use of, such as [layouts](#default-layout) and [partials](#partials).


{% endraw %}