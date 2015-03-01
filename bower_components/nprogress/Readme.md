NProgress
=========

Slim progress bars for Ajax'y applications. Inspired by Google, YouTube, and
Medium.

Installation
------------

Add jQuery (1.8 or above), [nprogress.js] and [nprogress.css] to your project.

Basic usage
-----------

Simply call `start()` and `done()` to control the progress bar.

~~~ js
NProgress.start();
NProgress.done();
~~~

Using [Turbolinks] or similar? Ensure you're using Turbolinks 1.3.0+, and use 
this: (explained 
    [here](https://github.com/rstacruz/nprogress/issues/8#issuecomment-23010560))

~~~ js
$(document).on('page:fetch',   function() { NProgress.start(); });
$(document).on('page:change',  function() { NProgress.done(); });
$(document).on('page:restore', function() { NProgress.remove(); });
~~~

Ideas
-----

 * Add progress to your Ajax calls! Bind it to the jQuery `ajaxStart` and
 `ajaxComplete` events.

 * Make a fancy loading bar even without Turbolinks/Pjax! Bind it to
 `$(document).ready` and `$(window).load`.

Advanced usage
--------------

__Percentages:__ To set a progress percentage, call `.set(n)`, where *n* is a
number between `0..1`.

~~~ js
NProgress.set(0.0);     // Sorta same as .start()
NProgress.set(0.4);
NProgress.set(1.0);     // Sorta same as .done()
~~~

__Incrementing:__ To increment the progress bar, just use `.inc()`. This
increments it with a random amount. This will never get to 100%: use it for
every image load (or similar).

~~~ js
NProgress.inc();
~~~

__Force-done:__ By passing `true` to `done()`, it will show the progress bar
even if it's not being shown. (The default behavior is that *.done()* will not
    do anything if *.start()* isn't called)

~~~ js
NProgress.done(true);
~~~

Configuration
-------------

Change the minimum percentage using `minimum`.

~~~ js
NProgress.configure({ minimum: 0.1 });
~~~

You can change the markup using `template`. To keep the progress
bar working, keep an element with `role='bar'` in there.

~~~ js
NProgress.configure({
  template: "<div class='....'>...</div>"
});
~~~

Adjust animation settings using `ease` (a CSS easing string) and `speed` (in 
    ms).

~~~ js
NProgress.configure({ ease: 'ease', speed: 500 });
~~~

Want to turn off trickling? Set `trickle` to `false`.

~~~ js
NProgress.configure({ trickle: false });
~~~

You can adjust the `trickleRate` (how much to increase per trickle) and 
`trickleSpeed` (how often to trickle, in ms).

~~~ js
NProgress.configure({ trickleRate: 0.02, trickleSpeed: 800 });
~~~

Want to turn off loading spinner? Set `showSpinner` to `false`.

~~~ js
NProgress.configure({ showSpinner: false });
~~~

Customization
-------------

Just edit `nprogress.css` to your liking. Tip: you probably only want to find
and replace occurances of `#29d`.

The included CSS file is pretty minimal... in fact, feel free to scrap it and
make your own!

Resources
---------

 * [New UI Pattern: Website Loading
 Bars](http://www.usabilitypost.com/2013/08/19/new-ui-pattern-website-loading-bars/) (usabilitypost.com)

Acknowledgements
----------------

© 2013, Rico Sta. Cruz. Released under the [MIT License](License.md).

**NProgress** is authored and maintained by [Rico Sta. Cruz][rsc] with help from 
its [contributors][c]

 * [My website](http://ricostacruz.com) (ricostacruz.com)
 * [Github](http://github.com/rstacruz) (@rstacruz)
 * [Twitter](http://twitter.com/rstacruz) (@rstacruz)

[rsc]: http://ricostacruz.com
[c]:   http://github.com/rstacruz/nprogress/contributors
[Turbolinks]: https://github.com/rails/turbolinks
[nprogress.js]: http://ricostacruz.com/nprogress/nprogress.js
[nprogress.css]: http://ricostacruz.com/nprogress/nprogress.css

