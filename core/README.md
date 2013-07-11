# Core

Core contains the bread and butter of ghost. It is currently divided up into:

* **client** - the assets, helpers, models, view and templates for rendering the admin panel backbone app
* **server** - the controllers & helpers for driving the server side app along with the model, api, and data
* **shared** - just contains lang for now, although it's not shared yet, more stuff should go here soon like handlebars helpers
* **test** - contains unit tests and a set of html prototypes of the admin UI. Really, this folder should reflect all of core
* **ghost.js** - currently both the glue that binds everything together and what gives us the API for registering themes and plugins. The initTheme function is a bit of a hack which lets us serve different views & static content up for the admin & blog

This structure is by no means final and recommendations are more than welcome.