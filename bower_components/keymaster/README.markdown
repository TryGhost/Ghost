# keymaster.js

Keymaster is a simple micro-library for defining and
dispatching keyboard shortcuts in web applications.

It has no dependencies.

*It’s a work in progress (e.g. beta), so spare me your nerdrage and instead
contribute! Patches are welcome, but they are not guaranteed to make
it in.*

## Usage

Include `keymaster.js` in your web app*, by loading it as usual:

```html
<script src="keymaster.js"></script>
```

Keymaster has no dependencies and can be used completely standalone.
It should not interfere with any JavaScript libraries or frameworks.

_*Preferably use a minified version that fits your workflow. You can
run `make` to have UglifyJS (if you have it installed) create a
`keymaster.min.js` file for you._

## Defining shortcuts

One global method is exposed, `key` which defines shortcuts when
called directly.

```javascript
// define short of 'a'
key('a', function(){ alert('you pressed a!') });

// returning false stops the event and prevents default browser events
key('ctrl+r', function(){ alert('stopped reload!'); return false });

// multiple shortcuts that do the same thing
key('⌘+r, ctrl+r', function(){ });
```

The handler method is called with two arguments set, the keydown `event` fired, and
an object containing, among others, the following two properties:

`shortcut`: a string that contains the shortcut used, e.g. `ctrl+r`
`scope`: a string describing the scope (or `all`)

```javascript
key('⌘+r, ctrl+r', function(event, handler){
  console.log(handler.shortcut, handler.scope);
});

// "ctrl+r", "all"
```


## Supported keys

Keymaster understands the following modifiers:
`⇧`, `shift`, `option`, `⌥`, `alt`, `ctrl`, `control`, `command`, and `⌘`.

The following special keys can be used for shortcuts:
`backspace`, `tab`, `clear`, `enter`, `return`, `esc`, `escape`, `space`,
`up`, `down`, `left`, `right`, `home`, `end`, `pageup`, `pagedown`, `del`, `delete`
and `f1` through `f19`.


## Modifier key queries

At any point in time (even in code other than key shortcut handlers),
you can query the `key` object for the state of any keys. This
allows easy implementation of things like shift+click handlers. For example,
`key.shift` is `true` if the shift key is currently pressed.

```javascript
if(key.shift) alert('shift is pressed, OMGZ!');
```


## Other key queries

At any point in time (even in code other than key shortcut handlers),
you can query the `key` object for the state of any key. This
is very helpful for game development using a game loop. For example,
`key.isPressed(77)` is `true` if the M key is currently pressed.

```javascript
if(key.isPressed("M")) alert('M key is pressed, can ya believe it!?');
if(key.isPressed(77)) alert('M key is pressed, can ya believe it!?');
```

You can also get these as an array using...
```javascript
key.getPressedKeyCodes() // returns an array of key codes currently pressed
```


## Scopes

If you want to reuse the same shortcut for separate areas in your single page app,
Keymaster supports switching between scopes. Use the `key.setScope` method to set scope.

```javascript
// define shortcuts with a scope
key('o, enter', 'issues', function(){ /* do something */ });
key('o, enter', 'files', function(){ /* do something else */ });

// set the scope (only 'all' and 'issues' shortcuts will be honored)
key.setScope('issues'); // default scope is 'all'
```


## Filter key presses

By default, when an `INPUT`, `SELECT` or `TEXTAREA` element is focused, Keymaster doesn't process any shortcuts.

You can change this by overwriting `key.filter` with a new function. This function is called before
Keymaster processes shortcuts, with the keydown event as argument.

If your function returns false, then the no shortcuts will be processed.

Here's the default implementation for reference:

```javascript
function filter(event){
  var tagName = (event.target || event.srcElement).tagName;
  return !(tagName == 'INPUT' || tagName == 'SELECT' || tagName == 'TEXTAREA');
}
```

If you only want _some_ shortcuts to work while in an input element, you can change the scope in the
`key.filter` function. Here's an example implementation, setting the scope to either `'input'` or `'other'`.
Don't forget to return `true` so the any shortcuts get processed.

```javascript
key.filter = function(event){
  var tagName = (event.target || event.srcElement).tagName;
  key.setScope(/^(INPUT|TEXTAREA|SELECT)$/.test(tagName) ? 'input' : 'other');
  return true;
}
```

However a more robust way to handle this is to use proper
focus and blur event handlers on your input element, and change scopes there as you see fit.


## noConflict mode

You can call ```key.noConflict``` to remove the ```key``` function from global scope and restore whatever ```key``` was defined to before Keymaster was loaded. Calling ```key.noConflict``` will return the Keymaster ```key``` function.

```javascript
var k = key.noConflict();
k('a', function() { /* ... */ });

key()
// --> TypeError: 'undefined' is not a function
```


## Unbinding shortcuts

Similar to defining shortcuts, they can be unbound using `key.unbind`.

```javascript
// unbind 'a' handler
key.unbind('a');

// unbind a key only for a single scope
// when no scope is specified it defaults to the current scope (key.getScope())
key.unbind('o, enter', 'issues');
key.unbind('o, enter', 'files');
```


## Notes

Keymaster should work with any browser that fires `keyup` and `keydown` events,
and is tested with IE (6+), Safari, Firefox and Chrome.

See [http://madrobby.github.com/keymaster/](http://madrobby.github.com/keymaster/) for a live demo.


## CoffeeScript

If you're using CoffeeScript, configuring key shortcuts couldn't be simpler:

```coffeescript
key 'a', -> alert('you pressed a!')

key '⌘+r, ctrl+r', ->
  alert 'stopped reload!'
  off

key 'o, enter', 'issues', ->
  whatevs()

alert 'shift is pressed, OMGZ!' if key.shift
```


## Contributing

To contribute, please fork Keymaster, add your patch and tests for it (in the `test/` folder) and
submit a pull request.

## TODOs

* Finish test suite

Keymaster is (c) 2011-2013 Thomas Fuchs and may be freely distributed under the MIT license.
See the `MIT-LICENSE` file.
