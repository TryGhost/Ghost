Version numbers
---------------

    $ bump *.json nprogress.js

Testing
-------

    $ npm install
    $ npm test

or try it out in the browser:

    $ open test/index.html

Testing component build
-----------------------

    $ component install
    $ component build
    $ open test/component.html

Pushing
-------

    $ git push origin master

Releasing
---------

Tag and stuff (`git release`), then:

    $ git push origin master:gh-pages
