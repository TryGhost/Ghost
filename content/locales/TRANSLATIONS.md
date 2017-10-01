<a href="https://github.com/TryGhost/Ghost"><img src="https://cloud.githubusercontent.com/assets/120485/18661790/cf942eda-7f17-11e6-9eb6-9c65bfc2abd8.png" alt="Ghost" /></a>

# How to Translate Ghost Into Any Language

<a title="By The World Flag [GFDL (http://www.gnu.org/copyleft/fdl.html) or CC BY-SA 4.0-3.0-2.5-2.0-1.0 (http://creativecommons.org/licenses/by-sa/4.0-3.0-2.5-2.0-1.0)], via Wikimedia Commons" href="https://commons.wikimedia.org/wiki/File%3AThe_world_flag_2006.svg"><img width="512" alt="The world flag 2006" src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/The_world_flag_2006.svg/512px-The_world_flag_2006.svg.png" style="margin: 0px 0px 20px 20px" align="right" /></a>

**Ghost opens to the whole world!**

Now Ghost's front-end and themes, that is to say the public side visible to site visitors, are fully translatable.

And it's as easy as writing, using only English and any other language you wish. You don't need to be a programmer: anyone can do it, and it takes very little time.

- [Quick Start](#quick-start)
- [How to Add Any Language](#how-to-add-any-language)
- [How to Make Any Theme Translatable](#how-to-make-any-theme-translatable)
- [Optional Advanced Features](#optional-advanced-features)
- [What's Coming Next](#whats-coming-next)
- [Copyright & License](#copyright--license)

## Quick Start

As a summary, depending on the different situations, this is how to do it.

You need:
- a translatable theme
- and a translation file

A theme is translatable when its *.hbs* templates have all their visible English texts wrapped in `{{t}}` translation helpers. Translatable themes also include copies of three overridden core templates, as explained in [*How to Make Any Theme Translatable*](#how-to-make-any-theme-translatable).
 
The translation file for your target language can be already included, or maybe not yet, by the theme.

For example, for Spanish (language tag "`es`"), and an example theme that we can call "`mytheme`", the **translation file** is:

- In the theme folder *content/themes/mytheme/assets/locales* (each theme's files):
  - *es.json* - to translate the theme's *.hbs* templates
 
### If you choose a translatable theme that includes your target language

Simply verify that the *.json* translation file is in place, and then activate the new language:

**Ghost's Settings > General > Language**

Just enter the [language tag &#x27B6;](https://www.w3schools.com/tags/ref_language_codes.asp) of the files to use (e.g.: `es` for Spanish, `fr` for French, `zh` for Chinese, `ja` for Japanese, `en-US` for American English, etc.) and click on the *Save settings* button. That's all folks!

### If the theme is already translatable, but does not include the language

Follow the easy steps of the section below: [*How to Add Any Language*](#how-to-add-any-language).

### If the theme is not yet translatable

See the section below: [*How to Make Any Theme Translatable*](#how-to-make-any-theme-translatable).

## How to Add Any Language

### 1. Copy the default English file

If the theme is already translatable, you can likely find the default file in this folder:

- *content/themes/mytheme/assets/locales*
  - *en.json* - copy it for front-end and theme translation

### 2. Rename the language file

Just change the default `en` language tag to the desired language.

### 3. Translate the included sentences

Edit the renamed translation file with any plain text editor. Usually they manage the international `UTF-8` encoding well. And place the file in the *assets/locales* folder of your theme.

An example with [optional features](#optional-advanced-features) (see the related section below) such as placeholders for flexibility, is the complete default English file *en.json* for [WorldCasper2 &#x27B6;](https://github.com/juan-g/WorldCasper2/tree/i18n-translatable-frontend), translatable clone of the default Casper 2.x theme:

```
{
    "worldcasper2": {
        "Back": "Back",
        "Newer Posts": "Newer Posts",
        "of": "of",
        "Older Posts": "Older Posts",
        "Page": "Page",
        "Subscribe": "Subscribe",
        "Subscribe to": "Subscribe to",
        "Subscribed!": "Subscribed!",
        "with the email address": "with the email address",
        "Your email address": "Your email address",
        "You've successfully subscribed to": "You've successfully subscribed to",
        "A collection of posts": "A collection of posts",
        "A collection of 1 post": "A collection of 1 post",
        "A collection of % posts": "A collection of % posts",
        "Get the latest posts delivered right to your inbox": "Get the latest posts delivered right to your inbox",
        "Latest Posts": "Latest Posts",
        "No posts": "No posts",
        "Read More": "Read More",
        "Read <a href='{url}'>more posts</a> by this author": "Read <a href='{url}'>more posts</a> by this author",
        "See all % posts": "See all % posts",
        "Share this": "Share this",
        "Stay up to date! Get all the latest &amp; greatest posts delivered straight to your inbox": "Stay up to date! Get all the latest &amp; greatest posts delivered straight to your inbox",
        "Subscribe": "Subscribe",
        "Subscribe to": "Subscribe to",
        "youremail@example.com": "youremail@example.com",
        "1 post": "1 post",
        "% posts": "% posts"
    }
}
```

And edited to translate for example into Spanish as *es.json*:

```
{
    "worldcasper2": {
        "Back": "Volver",
        "Newer Posts": "Artículos Siguientes",
        "of": "de",
        "Older Posts": "Artículos Anteriores",
        "Page": "Página",
        "Subscribe": "Suscríbete",
        "Subscribe to": "Suscríbete a",
        "Subscribed!": "¡Suscrito!",
        "with the email address": "con el correo electrónico",
        "Your email address": "Tu correo electrónico",
        "You've successfully subscribed to": "Te has suscrito con éxito a",
        "A collection of posts": "Una colección de artículos",
        "A collection of 1 post": "Una colección de 1 artículo",
        "A collection of % posts": "Una colección de % artículos",
        "Get the latest posts delivered right to your inbox": "Recibe los últimos artículos directamente en tu buzón",
        "Latest Posts": "Últimos Artículos",
        "No posts": "No hay artículos",
        "Read More": "Lee Más",
        "Read <a href='{url}'>more posts</a> by this author": "Lee <a href='{url}'>más artículos</a> de este autor",
        "See all % posts": "Ver todos los % artículos",
        "Share this": "Comparte",
        "Stay up to date! Get all the latest &amp; greatest posts delivered straight to your inbox": "¡Mantente al día! Recibe todos los últimos y mejores artículos directamente en tu buzón",
        "Subscribe": "Suscríbete",
        "Subscribe to": "Suscríbete a",
        "youremail@example.com": "tucorreo@ejemplo.com",
        "1 post": "1 artículo",
        "% posts": "% artículos"
    }
}
```

As you can see, it's usually just plain English on the left, and the language you choose on the right. Any code is optional and not required.

For example, optionally, any translation key can be used on the left and on the templates, but readable English is advisable for simplicity and to take advantage of fallback to the text inside the `{{t}}` translation helper when no translation is available.

Dates, with month names, are automatically translated. You don't need to include them in the translation files. 

For a translatable clone of the Casper 1.4 theme (versions 1.4 and 2.x have different designs), see [WorldCasper1 &#x27B6;](https://github.com/juan-g/WorldCasper1/tree/i18n-translatable-frontend).

## How to Make Any Theme Translatable

Ghost's themes use a very simple translation system, just for themes. On the other hand, server side messages for admins have a different system and will continue to use code in *.js* files with translation keys, such as `i18n.t('warnings.helpers.pagination.nextPrevValuesMustBeNumeric')`. However, to design and customize themes, just plain English is more user friendly, even when any translation key can also optionally be used.

For example, in *.hbs* theme templates:

```
{{t "Get the latest posts delivered right to your inbox"}}
```

### 1. Copy three core templates into the theme

To translate front-end core *.hbs* templates, shared by all themes, three core templates should be overridden by copies included within the theme:

- In the theme folder *content/themes/mytheme*:
  - *subscribe.hbs* - copy of *core/server/apps/subscribers/lib/views/subscribe.hbs*

- In the theme folder *content/themes/mytheme/partials*:
  - *pagination.hbs* - copy of *core/server/helpers/tpl/pagination.hbs*
  - *subscribe_form.hbs* - copy of *core/server/helpers/tpl/subscribe_form.hbs*

### 2. Look for text on the theme's .hbs templates

They contain the English text to translate, that is the text visible to site visitors. This also includes the copies overriding three core front-end templates.

### 3. Wrap it in {{t}} translation helpers

Just copy and paste `{{t "` to the left, and `"}}` to the rigth.

### 4. Copy and paste each text into the translation file

Do all these three steps for each text, before going to the next, to remember to add all of them to the translation file.

For now, just quickly write the English default file *assets/locales/en.json*. Later you can translate it as explained before.

Although the English version will work for themes even without default English file (because of the mentioned fallback to the text inside the `{{t}}` translation helper when no translation is available), it's advisable to include the default *assets/locales/en.json* anyway, because:

- It will be much easier for users to [add and contribute languages](#how-to-add-any-language) by copying and editing the default file, as explained in the previous section.
- Even for sites in English, Ghost users will be able to customize any theme texts by simply editing the default English file, without modifying the theme templates.

If you have the translation files of another Ghost theme, surely part of the texts will be common, and you can copy them and their translations.

To easily start a first translation file, copy the following into it, which includes the texts from overridden core front-end templates, common for all themes:

```
{
    "": {
        "Back": "",
        "Newer Posts": "",
        "of": "",
        "Older Posts": "",
        "Page": "",
        "Subscribe": "",
        "Subscribe to": "",
        "Subscribed!": "",
        "with the email address": "",
        "Your email address": "",
        "You've successfully subscribed to": "",
        "": "",
        "": "",
        "": "",
        "": "",
        "": "",
        "": "",
        "": "",
        "": "",
        "": "",
        "": ""
    }
}
```

For most texts, that's all and your theme is translatable now, although you can also use [optional features](#optional-advanced-features) (see related section below).

### 5. Share it with the theme maintainers

If you send the adapted theme and language files to the maintainers, there is a good chance that they will keep the translatability for the next versions.

And more translations mean more users, therefore more improvements and maintenance for the theme.

## Optional Advanced Features

### Replacement placeholders

For example:

In theme translation file *es.json*

```
"Proudly published with {ghostlink}": "Publicado con {ghostlink}",
```

And, in theme template *default.hbs*

```
{{{t "Proudly published with {ghostlink}" ghostlink="<a href=\"https://ghost.org\">Ghost</a>"}}}
```

Which gives, after translating the text and replacing the `{ghostlink}` placeholder with its parameter:

```
Publicado con <a href="https://ghost.org">Ghost</a>
```

Using `{{{t}}}` translation helper instead of `{{t}}` preserves working HTML without escaping it.

### Nested helpers

See [Handlebars subexpressions &#x27B6;](http://handlebarsjs.com/expressions.html#subexpressions).

For example:

In theme translation file *es.json*

```
" on ": " en ",
```

To translate a helper's parameter, e.g. `" on "` in theme template *loop.hbs*

```
{{tags prefix=" on "}}
```

a `(t)` nested translation helper (instead of normal `{{t}}` helper) can be used as a parameter inside another helper such as `{{tags}}`

```
{{tags prefix=(t " on ")}}
```

which, when translated, is equivalent to

```
{{tags prefix=" en "}}
```

### Placeholders with nested helpers

For example:

In theme translaion file *es.json*

```
"Read <a href='{url}'>more posts</a> by this author": "Lee <a href='{url}'>más artículos</a> de este autor",
```

And, in theme template *post.hbs*

```
{{{t "Read <a href='{url}'>more posts</a> by this author" url=(url)}}}.
```

Here, the `{url}` placeholder is replaced by the value of the `(url)` nested helper in the parameter, which is equivalent to the `{{url}}` helper.

### Plural helper

For example:

In theme translation file *es.json*

```
"No posts": "No hay artículos",
"1 post": "1 artículo",
"% posts": "% artículos"
```

To translate several helper's parameters, e.g. in theme template *author.hbs*

```
{{plural ../pagination.total empty='No posts' singular='1 post' plural='% posts'}}
```

several `(t)` nested translation helpers (instead of normal `{{t}}` helpers) can be used as parameters inside `{{plural}}` helper

```
{{plural ../pagination.total empty=(t "No posts") singular=(t "1 post") plural=(t "% posts")}}
```

`%` is replaced by the value of `../pagination.total`, e.g. `6`, giving after translation

```
6 artículos
```

### Translation of back-end messages

Server side messages are also optionally translatable.

For example, for Spanish (language tag "`es`"), and an example theme that we can call "`mytheme`", the translation file is:

- In the content folder *content/locales* (common files for Ghost core and all themes):
  - *es.json* - optional file for back-end server side messages from *.js* files, usually for admins

To add any language, copy the default English file, that you can find in this folder:

- *core/server/translations*
  - *en.json* - copy optionally, for server side messages

Then, rename the language file, just changing the default `en` language tag to the desired language.

Finally, translate the included sentences, and place the file in the *content/locales* folder.

### CSS content text override

Although Ghost's i18n system (translation helpers) doesn't apply to CSS, sometimes themes include, in style sheets, content text visible to site visitors.

In this case, you can translate it by a normal CSS override. For example for Casper 1.4 and its translatable clone WorldCasper1:

File *en.css* (that can be used as a model to translate)
```
.read-next-story .post:before {
    content: "Read This Next";
}
.read-next-story.prev .post:before {
    content: "You Might Enjoy";
}
```

File *es.css* (optional file to translate CSS content text visible to site visitors)
```
.read-next-story .post:before {
    content: "Sigue leyendo";
}
.read-next-story.prev .post:before {
    content: "Te puede gustar";
}
```

And, in theme template *default.hbs*, after the rest of style sheets to override

```
<link rel="stylesheet" type="text/css" href="{{asset "locales/{lang}.css" lang=(lang)}}" />
```

In this line, the {{asset}} helper can be equivalent in this example to

```
{{asset "locales/es.css"}}
```

That stylesheet line uses the replacement placeholder `{lang}`, and the nested helper `(lang)`.

## What's Coming Next

A new Ghost wiki to share translation files through public [gist &#x27B6;](https://help.github.com/articles/about-gists/) links, lists of translatable Ghost themes, and any useful internationalization/i18n resources.

## Copyright & License

Copyright (c) 2013-2017 Ghost Foundation - Released under the [MIT license &#x27B6;](https://github.com/TryGhost/Ghost/blob/master/LICENSE)
