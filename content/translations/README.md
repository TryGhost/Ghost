<a href="https://github.com/TryGhost/Ghost"><img src="https://cloud.githubusercontent.com/assets/120485/18661790/cf942eda-7f17-11e6-9eb6-9c65bfc2abd8.png" alt="Ghost" /></a>

# How to Translate Ghost Into Any Language

<a title="By The World Flag [GFDL (http://www.gnu.org/copyleft/fdl.html) or CC BY-SA 4.0-3.0-2.5-2.0-1.0 (http://creativecommons.org/licenses/by-sa/4.0-3.0-2.5-2.0-1.0)], via Wikimedia Commons" href="https://commons.wikimedia.org/wiki/File%3AThe_world_flag_2006.svg"><img width="512" alt="The world flag 2006" src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/The_world_flag_2006.svg/512px-The_world_flag_2006.svg.png" style="margin: 0px 0px 20px 20px" align="right" /></a>

**Ghost 1.0 opens to the whole world!**

Now Ghost's frontend and themes, that is to say the public side visible to site visitors, are fully translatable. Server side messages are also translatable.

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
- and translation files 
 
The translation files for your target language can be already included, or maybe not yet, by the theme.

For example, for Spanish (language tag "`es`"), and an example theme that we can call "`mytheme`", the four **translation files** are:

- In the content folder *content/translations* (common files for Ghost core and all themes):
  - *es.json* - for backend server side messages from *.js* files, usually for admins
  - *frontend_es.json* - for frontend core *.hbs* templates, shared by all themes

- In the theme folder *content/themes/mytheme/assets/translations* (each theme's files):
  - *mytheme_es.css* - optional file to translate CSS content text visible to site visitors
  - *mytheme_es.json* - to translate the theme's *.hbs* templates

### If you choose a translatable theme that includes your target language

Simply verify that the translation files are in place, and then activate the new language:

**Ghost's Settings > General > Language**

Just enter the [language tag &#x27B6;](https://www.w3schools.com/tags/ref_language_codes.asp) of the files to use (e.g.: `es` for Spanish, `fr` for French, `zh` for Chinese, `ja` for Japanese, `en-US` for American English, etc.) and click on the *Save settings* button. That's all folks!

### If the theme is already translatable, but does not include the language

Follow the easy steps of the section below: [*How to Add Any Language*](#how-to-add-any-language).

### If the theme is not yet translatable

See the section below: [*How to Make Any Theme Translatable*](#how-to-make-any-theme-translatable).

## How to Add Any Language

### 1. Copy the default English files

They are four files, that you can find in these folders:

- *core/server/translations*
  - *en.json*
  - *frontend_en.json*

- *content/themes/mytheme/assets/translations*
  - *mytheme_en.css*
  - *mytheme_en.json*

### 2. Rename the language files

Just change the default `en` language tag to the desired language.

### 3. Translate the included sentences

Edit the files you are interested in with any plain text editor. Usually they manage the international `UTF-8` encoding well.

In the case that for now you only want to translate the public frontend and theme, that is the copies of *frontend_en.json* and *mytheme_en.json*, then the content of the renamed copy of *en.json* for backend messages for admins can stay in English, but should be included with the new file name. The *.css* file is only needed if the theme includes CSS text visible to site visitors.

For example, the complete *frontend_en.json* default English file is the following:

```
{
    "frontend": {
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
        "You've successfully subscribed to": "You've successfully subscribed to"
    }
}
```

And edited to translate for example into Spanish as *frontend_es.json*:

```
{
    "frontend": {
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
        "You've successfully subscribed to": "Te has suscrito con éxito a"
    }
}
```

As you can see, it's just plain English on the left, and the language you choose on the right, without any code involved.

Dates, with month names, are automatically translated. You don't need to include them in the translation files. 

Another example with [optional features](#optional-advanced-features) (see the related section below) such as placeholders for flexibility, is *worldcasper_es.json*, the complete Spanish file for [WorldCasper &#x27B6;](https://github.com/juan-g/WorldCasper/tree/i18n-translatable-frontend), translatable clone of the default Casper theme:

```
{
    "worldcasper": {
        "A 1-post collection": "Una colección de 1 artículo",
        "A %-post collection": "Una colección de % artículos",
        "Close": "Cerrar",
        "Get the latest posts delivered right to your inbox": "Recibe los últimos artículos directamente en tu buzón",
        "Menu": "Menú",
        "No posts": "No hay artículos",
        " on ": " en ",
        "or subscribe": "¡O suscríbete",
        "Proudly published with {ghostlink}": "Publicado con {ghostlink}",
        "Read <a href='{url}'>more posts</a> by this author": "Lee <a href='{url}'>más artículos</a> de este autor",
        "Scroll Down": "Bajar",
        "Share this post": "Comparte",
        "Subscribe": "Suscríbete",
        "Subscribe to": "Suscríbete a",
        "via RSS": "por RSS",
        "with Feedly!": "con Feedly!",
        "Your email address": "Tu correo electrónico",
        "1 post": "1 artículo",
        "% posts": "% artículos"
    }
}
```

## How to Make Any Theme Translatable

Ghost's themes use a very simple translation system, just for themes. On the other hand, server side messages for admins have a different system and will continue to use code in *.js* files such as `i18n.t('warnings.helpers.pagination.nextPrevValuesMustBeNumeric')`. However, to design and customize themes, just plain English is more user friendly.

For example, in *.hbs* theme templates:

```
{{t "Get the latest posts delivered right to your inbox"}}
```

The few sentences in *.hbs* core frontend templates need a `where` parameter, not needed for themes:

```
{{t "You've successfully subscribed to" where="frontend"}}
```

Probably, developers of future apps with templates will also use this parameter, e.g. `where="myapp"` (there will likely be one theme and several apps enabled at the same time).

### 1. Look for text on the theme's .hbs templates

They contain the text to translate, that is the text visible lo site visitors.

### 2. Wrap it in {{t}} translation helpers

Just copy and paste `{{t "` to the left, and `"}}` to the rigth.

### 3. Copy and paste each text into the translation file

Do all these three steps for each text, before going to the next, to remember to add all of them to the translation file.

For now, just quickly write the English default file *mytheme_en.json*. Later you can translate it as explained before.

Naturally, replace `mytheme` with the simplified name of your theme (like the theme folder). In the future, it can be as well the name of a Ghost app with templates to translate.

Although the English version will work for themes even without default English file (because of fallback to the text inside the `{{t}}` translation helper when no translation is available), it's advisable to include the default *mytheme_en.json* anyway, because:

- It will be much easier for users to [add and contribute languages](#how-to-add-any-language) by copying and editing the default file, as explained in the previous section.
- Even for sites in English, Ghost users will be able to customize any theme texts by simply editing the default English file, without modifying the theme templates.

If you have the translation files of another Ghost theme, surely part of the texts will be common, and you can copy them and their translations.

To easily start a new translation file, copy the following into it:

```
{
    "": {
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

### 4. Share it with the theme maintainers

If you send the adapted theme and language files to the maintainers, there is a good chance that they will keep the translatability for the next versions.

And more translations mean more users, therefore more improvements and maintenance for the theme.

## Optional Advanced Features

### Translation of CSS content text

If the theme to translate includes, in style sheets, content text visible to site visitors, you can translate it by override. For example:

File *worldcasper_en.css*
```
.read-next-story .post:before {
    content: "Read This Next";
}
.read-next-story.prev .post:before {
    content: "You Might Enjoy";
}
```

File *worldcasper_es.css*
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
<link rel="stylesheet" type="text/css" href="{{asset "translations/{theme}_{lang}.css" theme=(theme) lang=(lang)}}" />
```

In this line, the {{asset}} helper can be equivalent in this example to

```
{{asset "translations/worldcasper_es.css"}}
```

That stylesheet line uses replacement placeholders `{theme}` and `{lang}`, and nested helpers `(theme)` and `(lang)`.

### Replacement placeholders

For example:

In file *mytheme_es.json*

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

In file *mytheme_es.json*

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

In file *mytheme_es.json*

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

In file *mytheme_es.json*

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

## What's Coming Next

A new Ghost wiki to share translation files through public [gist &#x27B6;](https://help.github.com/articles/about-gists/) links, lists of translatable Ghost themes, and any useful internationalization/i18n resources.

## Copyright & License

Copyright (c) 2013-2017 Ghost Foundation - Released under the [MIT license &#x27B6;](https://github.com/TryGhost/Ghost/blob/master/LICENSE)
