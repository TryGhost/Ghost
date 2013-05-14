[![Build Status](https://magnum.travis-ci.com/TryGhost/Ghost.png?token=hMRLUurj2P3wzBdscyQs&branch=master)](https://magnum.travis-ci.com/TryGhost/Ghost)

# Ghost

Welcome to the Ghost core repo. The code here is the result of a few stolen hours of free time hacking a proof of concept for the Kickstarter video. Pretty much everything is subject to and expected to change.

The top priorities right now are:

* Having a core RESTful API and consuming it internally
* Data model design & implementation - including a potential switch from JugglingDB to bookshelf.js
* Authentication and ACL
* Improving core architecture & design - modular structure, better dependency injection, testable code with tests



###To Install:

**Note:** It is highly recommended that you use the [Ghost-Vagrant](https://github.com/TryGhost/Ghost-Vagrant) setup for developing Ghost.

1. Clone the git repo
1. cd into the project folder and run ```npm install```.
	* If the install fails with errors to do with "node-gyp rebuild", follow the Sqlite3 install instructions
1. cd into /core/admin/assets and run ```compass compile --css-dir=css```


Frontend can be located at [localhost:3333](localhost:3333), Admin is at [localhost:3333/ghost](localhost:3333/ghost)


#### Sqlite3 Install Instructions
Ghost depends upon sqlite3, which has to be built for each OS. NPM is as smart as it can be about this, and as long as your machine has all the pre-requisites for compiling/building a C++ program, the npm install still works.

However, if you don't have the required pre-requisites, you will need to either get them, or as a shortcut, obtain a precompiled sqlite3 package for your OS.

I have created some of these, and they can be obtained from [this GitHub issue](https://github.com/developmentseed/node-sqlite3/issues/106).

The pre-compiled package should be downloaded, extracted and placed in the node\_modules folder, such that it lives in node\_modules/sqlite3, if you have a partial install of the sqlite3 package, replace it with the files you downloaded from github. Be sure that all the sqlite3 files and folders live directly in node\_modules/sqlite3 - there should note be a node\_modules/sqlite3/sqlite3 folder.


###Dependencies:

* express.js framework
* handlebars for templating
* standard css for frontend
* sass for admin (pre-compiled)
* moment.js for time / date manipulation
* underscore for object & array utils
* showdown for converting markdown to HTML
* nodeunit for unit testing
* sqlite3 for data storage
* jugglingdb ORM for interacting with the database
* Polyglot.js for i18n

#### Frontend libraries:

* jQuery 1.9.1
* showdown for converting markdown to HTML
* codemirror editor

### Working features:

* Dashboard
	* new post link
* Admin menu
	* G, dashboard, content, new post & settings menu items go to correct pages
* Content screen
	* Lists all posts with correct titles (incorrect time etc)
    * Select post in list highlights that post and opens it in the preview pane
* Write screen
	* Live preview works for all standard markdown
    * Save draft button saves entered title & content. Everything is published by default.
    * Editing/opening existing post puts correct info in title and content panels & save updates content.
* Database
	* The database is created and populated with basic data on first run of the server
    * New posts and edits save and last forever
    * The data can be reset by opening data/datastore.db and emptying the file. The next restart of the server will cause the database to be recreated and repopulated.
* Frontend
	* Homepage lists a number of posts as configured in config.js
    * Clicking on an individual post loads an individual post page
    * Date formatting helper uses moment

### Front End Work

A SASS compiler is required to work with the CSS in this project.

Run ```compass compile --css-dir=css``` from /core/admin/assets.

We also recommend [CodeKit](http://incident57.com/codekit/) (Paid/Mac) and [Scout](http://mhs.github.io/scout-app/) (Free/Mac/PC).