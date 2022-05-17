# Ghost Admin App

Ember.js application used as a client-side admin for the [Ghost](http://ghost.org) blogging platform. This readme is a work in progress guide aimed at explaining the specific nuances of the Ghost Ember app to contributors whose main focus is on this side of things.


## CSS

We use pure CSS, which is pre-processed for backwards compatibility by [Myth](http://myth.io). We do not follow any strict CSS framework, however our general style is pretty similar to BEM.

Styles are primarily broken up into 4 main categories:

* **Patterns** - are base level visual styles for HTML elements (eg. Buttons)
* **Components** - are groups of patterns used to create a UI component (eg. Modals)
* **Layouts** - are groups of components used to create application screens (eg. Settings)

All of these separate files are subsequently imported and compiled in `app.css`.


## Front End Standards

* 4 spaces for HTML & CSS indentation. Never tabs.
* Double quotes only, never single quotes.
* Use tags and elements appropriate for an HTML5 doctype (including self-closing tags)
* Adhere to the [Recess CSS](http://markdotto.com/2011/11/29/css-property-order/) property order.
* Always a space after a property's colon (.e.g, display: block; and not display:block;).
* End all lines with a semi-colon.
* For multiple, comma-separated selectors, place each selector on its own line.
* Use js- prefixed classes for JavaScript hooks into the DOM, and never use these in CSS as per [Slightly Obtrusive JavaSript](http://ozmm.org/posts/slightly_obtrusive_javascript.html)
* Avoid over-nesting CSS. Never nest more than 3 levels deep.
* Use comments to explain "why" not "what" (Good: This requires a z-index in order to appear above mobile navigation. Bad: This is a thing which is always on top!)
