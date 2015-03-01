---
layout: themes
meta_title: How to Make Ghost Themes - Ghost Docs
meta_description: An in depth guide to making themes for the Ghost blogging platform. Everything you need to know to build themes for Ghost.
chapter: themes
section: getting-started
permalink: /themes/getting-started/
prev_section: themes
next_section: handlebars
canonical: http://themes.ghost.org/v5.2/docs/getting-started
redirectToCanonical: true
---


{% raw %}

# Getting Started

If you're someone looking to make a few customisations to an existing theme, you may find the help articles on [support.ghost.org](http://support.ghost.org/themes) more useful, as they cover the most common adjustments like adding disqus or navigation step-by-step.

If you're looking to start building your own custom theme from scratch, or using another theme as a basis, then this guide is for you :)

## Setting Up

The first thing you'll need to do is, is setup a local development environment for Ghost. Use whichever is your preferred method of installing Ghost (zip, git or npm) to get it running on your computer, the Ghost [README.md](https://github.com/TryGhost/Ghost) and [support site](http://support.ghost.org/installation) have more information about getting installed.

The most important thing is that you run Ghost in development mode not production mode (this means using `npm start` rather than `npm start --production`) because in development mode you don't have to keep restarting Ghost to see your changes.

You'll also need an editor which has good support for Handlebars. [Brackets](http://brackets.io) is a free editor which works well for editing theme files, alternatively IntelliJ, Sublime and many other popular IDEs have great Handlebars support either built in or via a plugin.

## Creating Your Own Theme

Once you've got your development environment setup and running in `development` mode, it's time to decide whether you want to create a brand new theme from scratch, or whether you want to use another theme, such as [Casper](https://github.com/TryGhost/Ghost) as a base. You may prefer to code up your new design in to HTML & CSS first, and then convert this into a working theme.

Whichever method you choose, you need to make sure you have a folder in your `/content/themes/` directory with an appropriate name, ready to contain your theme files. At the bare minimum, the directory should contain an `index.hbs` file, a `post.hbs` file and a `package.json` file, which contains the name and version number of your theme.  See the section on [structure](/themes/structure) for further details of the recommended and required parts of a theme's structure.

Once you've got your theme directory in place, you'll need to restart Ghost. Ghost won't detect new files automatically, but it will pick up changes to those files once it knows about them (providing you're in development mode). Navigate to `/ghost/settings/`, select your new theme from the dropdown and save the new settings to activate your theme.

You're now ready to start making changes. Remember to restart Ghost if you add a new `.hbs` file. Apart from this, you'll only need to refresh the page to see your changes.


### The post list

<code class="path">index.hbs</code> gets handed an object called `posts` which can be used with the foreach helper to output each post. E.g.

```
{{#foreach posts}}
// here we are in the context of a single post
// whatever you put here gets run for each post in posts
{{/foreach}}
```

See the section on the [`{{#foreach}}`](#foreach-helper) helper for more details.

#### Pagination

See the section on the [`{{pagination}}`](#pagination-helper) helper.

### Outputting individual posts

Once you are in the context of a single post, either by looping through the posts list with `foreach` or inside of <code class="path">post.hbs</code> you have access to the properties of a post.

For the time being, these are:

*   id – *post id*
*   title – *post title*
*   url – *the relative URL for a post*
*   content – *post HTML*
*   published_at – *date the post was published*
*   author – *full details of the post author* (see below for more details)

Each of these properties can be output using the standard handlebars expression, e.g. `{{title}}`.

<div class="note">
  <p>
    <strong>Notes:</strong> <ul>
      <li>
        the content property is overridden and output by the <code>{{content}}</code> helper which ensures the HTML is output safely & correctly. See the section on the <a href="#content-helper"><code>{{content}}</code> helper</a> for more info.
      </li>
      <li>
        the url property provided by the <code>{{url}}</code> helper. See the section on the <a href="#url-helper"><code>{{url}}</code> helper</a> for more info.
      </li>
    </ul>
  </p>
</div>

#### Post author

When inside the context of a single post, the following author data is available:

*   `{{author.name}}` – the name of the author
*   `{{author.bio}}` – the author's bio
*   `{{author.website}}` – the author's website
*   `{{author.image}}` – the author's profile image
*   `{{author.cover}}` – the author's cover image

You can use just`{{author}}` to output the author's name with a link to their author page.

This can also be done by using a block expression:

```
{{#author}}
    <a href="{{url}}">{{name}}</a>
{{/author}}
```

#### Post Tags

When inside the context of a single post, the following tag data is available

*   `{{tag.name}}` – the name of the tag

You can use `{{tags}}` to output a customisable list of tags, this can also be done by using a block expression:

```
<ul>
    {{#foreach tags}}
        <li>{{name}}</li>
    {{/foreach}}
</ul>
```

See the section on the [`{{tags}}`](#tags-helper) helper for details of the options.

### Global Settings

Ghost themes have access to a number of global settings via the `@blog` global data accessor.

*   `{{@blog.url}}` – the url specified for this env in <code class="path">config.js</code>
*   `{{@blog.title}}` – the blog title from the settings page
*   `{{@blog.description}}` – the blog description from the settings page
*   `{{@blog.logo}}` – the blog logo from the settings page



{% endraw %}
