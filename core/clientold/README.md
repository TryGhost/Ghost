## What's this?

This is the old Ghost admin UI built in backbone.js. It gets served if you visit the URL `/ghost/`.

We're currently in the process of replacing this UI with a new one written in Ember which lives in the `/client/`
folder, and is served when you visit the URL `/ghost/ember/`.

In short, we currently have 2 admins:

* Old, Backbone Admin UI lives in `/clientold/` and is served from `/ghost/`
* New, Ember Admin UI lives in `/client/` and is served from `/ghost/ember/`

For more information, please read the [Ember admin wiki page](https://github.com/TryGhost/Ghost/wiki/Ember-Admin-UI)