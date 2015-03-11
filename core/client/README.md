# Ghost Admin Client

Ember.js application used as a client-side admin for the [Ghost](http://ghost.org) blogging platform. This readme is a work in progress guide aimed at explaining the specific nuances of the Ghost Ember app to contributors whose main focus is on this side of things.


## Architecture

ToDo: Explain the basic Ember app structure.

```
client/
├── assets/
│   ├── ghost.css
│   └── ghost.min.css
├── things/
│   ├── things.js
│   └── things.min.js
└── things/
    ├── things.js
    └── things.js
```

## SASS

All CSS is written in SASS and compiled using grunt. We do not follow any strict CSS framework, however our general style is pretty similar to BEM.

Styles are primarily broken up into 4 main categories:

* **Helpers** - are pure-sass files. Variables/mixins/things which are generally never compiled to actual CSS, and are simply used to aid development.
* **Patterns** - are base level visual styles for HTML elements (eg. Buttons)
* **Components** - are groups of patterns used to create a UI component (eg. Modals)
* **Layouts** - are groups of components used to create application screens (eg. Settings)
* **Lib** - is where we store styles for 3rd party components.

All of these separate files are subsequently imported and compiled in `screen.scss`.


## Front End Standards

* 4 spaces for HTML & CSS indentation. Never tabs.
* Double quotes only, never single quotes.
* Use tags and elements appropriate for an HTML5 doctype (including self-closing tags)
* Adhere to the [Recess CSS](http://markdotto.com/2011/11/29/css-property-order/) property order.
* Always a space after a property's colon (.e.g, display: block; and not display:block;).
* End all lines with a semi-colon.
* For multiple, comma-separated selectors, place each selector on its own line.
* Use js- prefixed classes for JavaScript hooks into the DOM, and never use these in CSS as per [Slightly Obtrusive JavaSript](http://ozmm.org/posts/slightly_obtrusive_javascript.html)
* Avoid SASS over-nesting. Never nest more than 3 levels deep.
* Use comments to explain "why" not "what" (Eg. This requires a z-index in order to appear above mobile navigation. Not: This is a thing which is always on top!)
