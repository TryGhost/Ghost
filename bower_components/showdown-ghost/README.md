# Showdown

A JavaScript port of Markdown

## Note

  > Showdown is now maintained by the [showdownjs](https://github.com/showdownjs) organization on Github.
  > 
  > The organization needs members to maintain Showdown.
  > 
  > Please see [this issue](https://github.com/showdownjs/showdown/issues/114) to express interest or comment on this note.

## Original Attributions

Showdown Copyright (c) 2007 John Fraser.
<http://www.attacklab.net/>

Original Markdown Copyright (c) 2004-2005 John Gruber
<http://daringfireball.net/projects/markdown/>

Redistributable under a BSD-style open source license.
See license.txt for more information.

## Quick Example

```js
var Showdown = require('showdown');
var converter = new Showdown.converter();

converter.makeHtml('#hello markdown!');

// <h1 id="hellomarkdown">hello, markdown</h1>
```

## What's it for?

Developers can use Showdown to:

  * Add in-browser preview to existing Markdown apps

    Showdown's output is (almost always) identical to
    markdown.pl's, so the server can reproduce exactly
    the output that the user saw.  (See below for
    exceptions.)

  * Add Markdown input to programs that don't support it

    Any app that accepts HTML input can now be made to speak
    Markdown by modifying the input pages's HTML.  If your
    application lets users edit documents again later,
    then they won't have access to the original Markdown
    text.  But this should be good enough for many
    uses -- and you can do it with just a two-line
    `onsubmit` function!

  * Add Markdown input to closed-source web apps

    You can write bookmarklets or userscripts to extend
    any standard textarea on the web so that it accepts
    Markdown instead of HTML.  With a little more hacking,
    the same can probably be done with  many rich edit
    controls.

  * Build new web apps from scratch

    A Showdown front-end can send back text in Markdown,
    HTML or both, so you can trade bandwidth for server
    load to reduce your cost of operation.  If your app
    requires JavaScript, you won't need to do any
    Markdown processing on the server at all.  (For most
    uses, you'll still need to sanitize the HTML before
    showing it to other users -- but you'd need to do
    that anyway if you're allowing raw HTML in your
    Markdown.)


## Browser Compatibility

Showdown has been tested successfully with:

  * Firefox 1.5 and 2.0
  * Internet Explorer 6 and 7
  * Safari 2.0.4
  * Opera 8.54 and 9.10
  * Netscape 8.1.2
  * Konqueror 3.5.4

In theory, Showdown will work in any browser that supports ECMA 262 3rd Edition (JavaScript 1.5).  The converter itself might even work in things that aren't web browsers, like Acrobat.  No promises.


## Extensions

Showdown allows additional functionality to be loaded via extensions.

### Client-side Extension Usage

```js
<script src="src/showdown.js" />
<script src="src/extensions/twitter.js" />

var converter = new Showdown.converter({ extensions: 'twitter' });
```

### Server-side Extension Usage

```js
// Using a bundled extension
var Showdown = require('showdown');
var converter = new Showdown.converter({ extensions: ['twitter'] });

// Using a custom extension
var mine = require('./custom-extensions/mine');
var converter = new Showdown.converter({ extensions: ['twitter', mine] });
```


## Known Differences in Output

In most cases, Showdown's output is identical to that of Perl Markdown v1.0.2b7.  What follows is a list of all known deviations.  Please file an issue if you find more.

  * This release uses the HTML parser from Markdown 1.0.2b2,
    which means it fails `Inline HTML (Advanced).text` from
    the Markdown test suite:

        <div>
        <div>
        unindented == broken
        </div>
        </div>

  * Showdown doesn't support the markdown="1" attribute:

        <div markdown="1">
             Markdown does *not* work in here.
        </div>

    This is half laziness on my part and half stubbornness.
    Markdown is smart enough to process the contents of span-
    level tags without screwing things up; shouldn't it be
    able to do the same inside block elements?  Let's find a
    way to make markdown="1" the default.


  * You can only nest square brackets in link titles to a
    depth of two levels:

        [[fine]](http://www.attacklab.net/)
        [[[broken]]](http://www.attacklab.net/)

    If you need more, you can escape them with backslashes.


  * When sublists have paragraphs, Showdown produces equivalent
    HTML with a slightly different arrangement of newlines:

        + item

             - subitem

               The HTML has a superfluous newline before this
               paragraph.

             - subitem

               The HTML here is unchanged.

             - subitem

               The HTML is missing a newline after this
               list subitem.



  * Markdown.pl creates empty title attributes for
    inline-style images:

        Here's an empty title on an inline-style
        ![image](http://w3.org/Icons/valid-xhtml10).

    I tried to replicate this to clean up my diffs during
    testing, but I went too far: now Showdown also makes
    empty titles for reference-style images:

        Showdown  makes an empty title for
        reference-style ![images][] too.

        [images]: http://w3.org/Icons/valid-xhtml10


  * With crazy input, Markdown will mistakenly put
    `<strong>` or `<em>` tags in URLs:

        <a href="<*Markdown adds em tags in here*>">
           improbable URL
        </a>

    Showdown won't.  But still, don't do that.


## Tests

A suite of tests is available which require node.js.  Once node is installed, run the following command from the project root to install the development dependencies:

    npm install --dev

Grunt is used to task run mocha tests and jshint validation. Install the grunt-cli tool globally:

    npm install grunt-cli -g

Once installed the tests can be run from the project root using:

    npm test

New test cases can easily be added.  Create a markdown file (ending in `.md`) which contains the markdown to test.  Create a `.html` file of the exact same name.  It will automatically be tested when the tests are executed with `mocha`.


## Creating Markdown Extensions

A showdown extension is simply a function which returns an array of extensions.  Each single extension can be one of two types:

  * Language Extension -- Language extensions are ones that that add new markdown syntax to showdown.  For example, say you wanted `^^youtube http://www.youtube.com/watch?v=oHg5SJYRHA0` to automatically render as an embedded YouTube video, that would be a language extension.
  * Output Modifiers -- After showdown has run, and generated HTML, an output modifier would change that HTML.  For example, say you wanted to change `<div class="header">` to be `<header>`, that would be an output modifier.

Each extension can provide two combinations of interfaces for showdown.

### Regex/Replace

Regex/replace style extensions are very similar to javascripts `string.replace` function.  Two properties are given, `regex` and `replace`.  `regex` is a string and `replace` can be either a string or a function.  If `replace` is a string, it can use the `$1` syntax for group substitution, exactly as if it were making use of `string.replace` (internally it does this actually);  The value of `regex` is assumed to be a global replacement.

**Example:**

```js
var demo = function(converter) {
  return [
    // Replace escaped @ symbols
    { type: 'lang', regex: '\\@', replace: '@' }
  ];
}
```

### Filter

Alternately, if you'd just like to do everything yourself, you can specify a filter which is a callback with a single input parameter, text (the current source text within the showdown engine).

**Example:**

```js
var demo = function(converter) {
  return [
    // Replace escaped @ symbols
    { type: 'lang', function(text) {
      return text.replace(/\\@/g, '@');
    }}
  ];
}
```

### Implementation Concerns

One bit which should be taken into account is maintaining both client-side and server-side compatibility.  This can be achieved with a few lines of boilerplate code.  First, to prevent polluting the global scope for client-side code, the extension definition should be wrapped in a self-executing function.

```js
(function(){
  // Your extension here
}());
```

Second, client-side extensions should add a property onto `Showdown.extensions` which matches the name of the file.  As an example, a file named `demo.js` should then add `Showdown.extensions.demo`.  Server-side extensions can simply export themselves.

```js
(function(){
  var demo = function(converter) {
    // ... extension code here ...
  };

  // Client-side export
  if (typeof window !== 'undefined' && window.Showdown && window.Showdown.extensions) { window.Showdown.extensions.demo = demo; }
  // Server-side export
  if (typeof module !== 'undefined') module.exports = demo;
}());
```

### Testing Extensions

The showdown test runner is setup to automatically test cases for extensions.  To add test cases for an extension, create a new folder under `./test/extensions` which matches the name of the `.js` file in `./src/extensions`.  Place any test cases into the filder using the md/html format and they will automatically be run when tests are run.


## Credits

  * Origins
    * [John Fraser](http://attacklab.net/):<br/>
      Author of Showdown
    * [John Gruber](http://daringfireball.net/projects/markdown/):<br/>
      Author of Markdown
  * Maintenance/Contributions (roughly chronologically)
    * [Corey Innis](http://github.com/coreyti):<br/>
      GitHub project maintainer
    * [Remy Sharp](https://github.com/remy/):<br/>
      CommonJS-compatibility and more
    * [Konstantin Käfer](https://github.com/kkaefer/):<br/>
      CommonJS packaging
    * [Roger Braun](https://github.com/rogerbraun):<br/>
      Github-style code blocks
    * [Dominic Tarr](https://github.com/dominictarr):<br/>
      Documentation
    * [Cat Chen](https://github.com/CatChen):<br/>
      Export fix
    * [Titus Stone](https://github.com/tstone):<br/>
      Mocha tests, extension mechanism, and bug fixes
    * [Rob Sutherland](https://github.com/roberocity):<br/>
      The idea that lead to extensions
    * [Pavel Lang](https://github.com/langpavel):<br/>
      Code cleanup
    * [Ben Combee](https://github.com/unwiredben):<br/>
      Regex optimization
    * [Adam Backstrom](https://github.com/abackstrom):<br/>
      WebKit bugfix
    * [Pascal Deschênes](https://github.com/pdeschen):<br/>
      Grunt support, extension fixes + additions, packaging improvements, documentation
