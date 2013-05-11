# Core

Core contains the bread and butter of ghost. It is currently divided up into:

* **admin** - the views, controllers, assets and helpers for rendering & working the admin panel
* **frontend** - the controllers & helpers for creating the frontend of the blog. Views & assets live in themes
* **lang** - the current home of everything i18n, this was done as a proof of concept on a very early version of the prototype and needs love
* **shared** - basically everything to do with data & models. The sqlite db file lives in the data folder here. This is the part that needs the most work so it doesn't make much sense yet, and is also the highest priority
* **test** - currently contains two sad unit tests and a set of html prototypes of the admin UI. Really, this folder should reflect all of core. It is my personal mission to make that happen ASAP & get us linked up with Travis.
* **ghost.js** - currently both the glue that binds everything together and what gives us the API for registering themes and plugins. The initTheme function is a bit of a hack which lets us serve different views & static content up for the admin & frontend.

This structure is by no means final and recommendations are more than welcome.