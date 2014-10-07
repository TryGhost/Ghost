---
layout: themes
meta_title: Ghost Themes - Ghost Developer Docs
meta_description: An in depth guide to making themes for the Ghost blogging platform. Everything you need to know to build themes for Ghost.
chapter: themes
section: changelog
permalink: /themes/changelog/
prev_section: helpers
next_section: troubleshooting
canonical: http://themes.ghost.org/v5.2/docs/changelog
redirectToCanonical: true
---

{% raw %}

# Change Log


The following document acts as a reference for developers who  want to keep their theme up-to-date with the latest
changes in the Ghost theme API. Since the original
[public release of 0.3.2](https://github.com/TryGhost/Ghost/releases/tag/0.3.2) there have been a number of changes to
the Ghost theme API and the way Ghost themes work, resulting in some new requirements and some deprecated features.

### Keeping up to date

The best way to keep up-to-date with the changes is to subscribe to the
[developer blog](http://dev.ghost.org). All theme related blog posts are tagged with
'[themes](http://dev.ghost.org/tag/themes/)', so you can subscribe to an RSS feed of only
[theme related posts](http://dev.ghost.org/tag/themes/rss/) if you prefer.

## Deprecated features

These features have been deprecated and will be removed in a future version.

* `{{pageUrl}}` helper, used in pagination templates, was renamed to `{{page_url}}` in Ghost 0.4.2
* `{{author.email}}` was removed in Ghost 0.5.0
* `.archive-template` and `.page` classes from `{{body_class}}` helper deprecated in 0.5.2
* `.post-template` class appearing on pages (it will only appear on posts) deprecated as of Ghost 0.5.2

## Important new requirements

* `{{asset}}` helper, introduced in Ghost 0.4.0, is required for including css, js and images in your theme.
Please see the [asset helper](/themes/helpers/asset/) documentation for further information.
* `package.json` file, introduced in Ghost 0.4.2, is required to define the name of your theme file. Please see the
[package.json](/themes/structure/#package.json) documentation for further information.

## Ghost 0.5.2

<date class="release-date">25 Sep 2014</date>

#### New:

* `{{is}}` helper
* `{{image}}` for posts
* Custom tag templates i.e. `tag-{{slug}}.hbs`

#### Changed

* `{{body_class}}` output
* `{{meta_title}}` output
* `{{meta_description}}` output
* `{{ghost_head}}` output

#### Deprecated

* `.archive-template` and `.page` classes from `{{body_class}}`.
* `.post-template` will soon only appear on posts, not pages.

## Ghost 0.5.0

<date class="release-date">11th Aug 2014</date>

#### New

* Author pages i.e. `author.hbs`
* `home.hbs` template
* `{{plural}}` helper

#### Changed

* `{{has}}` helper updates for authors
* `{{author}}` changed to output HTML

#### Deprecated

* `{{author.email}}` now outputs an empty string

Please see the [multi-user blog post](http://dev.ghost.org/themes-multi-user-ready/) for more information.

## Ghost 0.4.2

<date class="release-date">26th Mar 2014</date>

#### New

* `package.json` support (will be required)
* `{{log}}` helper
* `{{has}}` helper
* Tag pages `tag.hbs`
* Custom page templates i.e. `page-{{slug}}.hbs`

#### Changed

* `{{pageUrl}}` -> `{{page_url}}`
* `{{tags}}` changed to output HTML

#### Deprecated

* `{{pageUrl}}` will be removed

Please see the [0.4.2 blog post](http://dev.ghost.org/new-for-themes-0-4-2/) for more information.

## Ghost 0.4.0

#### New

* Featured posts
* Static pages with `page.hbs`
* Custom error pages `error.hbs`
* Customisable favicon
* `{{asset}}` helper
* `{{encode}}` helper

#### Changed

* `{{tags}}` got `prefix` and `suffix` options
* `{{excerpt}}` got unicode character support

#### Deprecated

* Using `{{@blog.url}}` or relative urls for assets - please use the `{{asset}}` helper

<date class="release-date">13th Jan 2014</date>

Please see the [0.4.0 blog post](http://dev.ghost.org/ghost-0-4-themes/) for more information.

{% endraw %}