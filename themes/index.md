---
layout: themes
meta_title: How to Make Ghost Themes - Ghost Docs
meta_description: An in depth guide to making themes for the Ghost blogging platform. Everything you need to know to build themes for Ghost.
chapter: themes
next_section: getting-started
canonical: http://themes.ghost.org/
redirectToCanonical: true
---

{% raw %}

# Overview

Welcome to Ghost's theme development guide!

If you're new to Ghost themes, we recommend starting right here, and reading through the guide pages about how Ghost themes work before getting stuck in.

If you're already comfortable building themes for Ghost, perhaps jump over to the [helper reference](), we're working on turning this into a Ghost theming dictionary. Be sure to keep an eye on the [change log]() as this is where we keep track of all the things we add, remove and change which may break your theme, or make it more awesome!

## About Ghost Themes

Ghost themes are intended to be very simple to build and maintain. They use the [Handlebars]() templating language, which is (almost) logicless and creates strong separation between templates (the HTML) and any business logic (JavaScript) via [helpers](). This separation lends itself towards easier collaboration between designers and developers when building themes. Learning Handlebars thoroughly will help you realise the full power of theming Ghost, and to that end we're working on expanding our [Handlebars]() section here in the docs.

With Handlebars, you can create the static HTML and CSS for a theme just the way you want it, and then substitute in Handlebars expressions wherever you need dynamic data. For example you might output a post title using `{{title}}` - this is a handlebars expression for referencing a data item called `title`. All Handlebars expressions are contained in either double or triple curly braces, so they're easy to spot.

To get Ghost to understand your HTML files as being theme files, you'll need to use the `.hbs` file extension. Ghost also expects your files to have certain names, some of which are required. Each of these files or 'templates' will be used by a different part of your blog and therefore get access to different data. You can find out more about this in the [structure]() section of the theme docs.

Theme templates are hierarchical, i.e one template can extend another template, which means that all your base HTML doesn't have to be repeated. There is also support for partial templates, meaning you can share blocks of HTML between multiple templates. Using these features it's possible to reduce code duplication and keep individual templates focused on doing a single job to keep your theme lightweight and easy to maintain.

We really hope you'll enjoy Ghost's approach to theming.

## Behind the Scenes

Ghost is intended to be a happy medium between a completely dynamic CMS-style application, and a static file generator. The Ghost admin is a dynamic client side app, but the blog pages are generated server side and sent to the browser as static HTML. This makes Ghost themes super fast, and also allows for the blog pages to be heavily cached.

If you're familiar with MVC, it may help to think of the pages of a Ghost blog in this way, with your templates as the views. On the server there's a router which takes a request for a URL and figures out which controller needs to be used. The controller takes information from the router (like the post slug), the data needed for the page (i.e. the model) and your theme template (the view) and puts it all together to create a finished page.

In production mode, the template files are loaded and cached by the server ready to send to the browser. This means that if you make changes to a `*.hbs` file, you won't see those changes reflected unless you restart Ghost. This doesn't happen in development mode, and so pages will take a little longer to get generated, but it makes creating your theme much easier.

All assets provided by your theme like css, js and images are served with headers telling browsers and any other cache that these files are good to cache for a long period, and the `{{asset}}` helper ensures they get refreshed at the right time. If you include assets without using the `{{asset}}` helper, this will cause problems for people using their blog with a cache and also anyone using a subdirectory, therefore using the `{{asset}}` helper is required.

At present, Ghost themes only support serving standard CSS and JS - there is no support for CSS preprocessors etc. That's not to say you can't build your theme using those tools, only that the theme you provide to Ghost must contain the built CSS rather than the source files.


{% endraw %}