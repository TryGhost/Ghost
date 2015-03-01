# nanoScroller.js
[nanoScroller.js](https://github.com/jamesflorentino/nanoScrollerJS) is a jQuery plugin that offers a simplistic way of implementing Mac OS X Lion-styled scrollbars for your website.
It uses minimal HTML markup being `.nano > .nano-content`. The other scrollbar div elements `.pane > .nano-slider` are added during run time to prevent clutter in templating. The latest version utilizes native scrolling and works with the iPad, iPhone, and some Android Tablets.

### Downloads

- [Production version](https://raw.github.com/jamesflorentino/nanoScrollerJS/master/bin/javascripts/jquery.nanoscroller.min.js)
- [Development version](https://raw.github.com/jamesflorentino/nanoScrollerJS/master/bin/javascripts/jquery.nanoscroller.js)
- [Default stylesheet](https://raw.github.com/jamesflorentino/nanoScrollerJS/master/bin/css/nanoscroller.css)


To start using, you need three basic things:

### 1. Markup

The following type of markup structure is needed to make the plugin work:

```html
<div id="about" class="nano">
    <div class="nano-content"> ... content here ...  </div>
</div>
```

Copy the HTML markup. Change `.nano` into something related to your content. Though you can also remove that attribute as long as you have a parent div with an ID reference. e.g. `#parent > .nano`. `nano` and `nano-content` classnames can be customized via plugin options (_in that case you must rename them inside the plugin's CSS file as well_).

### 2. CSS

Link to the `nanoscroller.css` file inside your page's `<head>` section (...or copy the contents from it to your page's main stylesheet file).

```html
<link rel="stylesheet" href="nanoscroller.css">
```

You should specify a width and a height to your container, and apply some custom styling for your scrollbar. Here's an example:

```css
.nano { background: #bba; width: 500px; height: 500px; }
.nano .nano-content { padding: 10px; }
.nano .nano-pane   { background: #888; }
.nano .nano-slider { background: #111; }
```

### 3. JavaScript

Running this script will apply the nanoScroller plugin to all DOM elements with a `.nano` className.

```js
$(".nano").nanoScroller();
```

### Advanced methods

### scroll

To scroll at the top:

```js
$(".nano").nanoScroller({ scroll: 'top' });
```

To scroll at the bottom:

```js
$(".nano").nanoScroller({ scroll: 'bottom' });
```

To scroll at the top with an offset value:

```js
$(".nano").nanoScroller({ scrollTop: value });
```

To scroll at the bottom with an offset value:

```js
$(".nano").nanoScroller({ scrollBottom: value });
```

To scroll to an element:

```js
$(".nano").nanoScroller({ scrollTo: $('#a_node') });
```

#### stop:

To stop the operation. This option will tell the plugin to disable all event bindings and hide the gadget scrollbar from the UI.

```js
$(".nano").nanoScroller({ stop: true });
```

#### destroy:

Destroys nanoScroller and restores browser's native scrollbar.

```js
$(".nano").nanoScroller({ destroy: true });
```

#### flash:

To flash the scrollbar gadget for an amount of time defined in plugin settings (_defaults to 1,5s_). Useful if you want to show the user (e.g. on pageload) that there is more content waiting for him.

```js
$(".nano").nanoScroller({ flash: true });
```

#### nanoScroller();

Refresh the scrollbar. This simply re-calculates the position and height of the scrollbar gadget.

```js
$(".nano").nanoScroller();
```

### Custom events

#### 'scrollend'

A custom `'scrollend'` event is triggered on the element every time the user has scrolled to the end of the content element (does *not* get triggered more than once when user tries to scroll down and has already reached the end of scrollable content).

```js
$(".nano").bind("scrollend", function(e){
    console.log("current HTMLDivElement", e.currentTarget);
});
```

Some browsers trigger this event more than once each time, so to listen to the custom event, instead of using jQuery's normal `.bind` or `.on`, you most likely want to use [this tiny jQuery debounce plugin](https://github.com/diaspora/jquery-debounce) to prevent browsers from firing your function more than once every 100ms.

```js
$(".nano").debounce("scrollend", function() {
    alert("The end");
}, 100);
```

#### 'scrolltop'

Same as the `'scrollend'` event, but it is triggered every time the user has scrolled to the top of the content element.

#### 'update'

Same as the `'scrolltop'` and `'scrollend'` events, but it's triggered every time the user scrolls. It also carries a JavaScript object with the current position, the maximum height and the direction (`up` or `down`).

```js
$(".nano").on("update", function(event, values){ 
    console.debug( values );
});
```

### Plugin Options

There are a few options that you can change when running nanoScroller, e.g. `$(".nano").nanoScroller({ paneClass: 'myclass' });`

#### iOSNativeScrolling

Set to true if you want to use native scrolling in iOS 5+. This will disable your custom nanoScroller scrollbar in iOS 5+ and use the native one instead. While the native iOS scrollbar usually works much better, [there could possibly be bugs](http://github.com/scottjehl/Device-Bugs/issues) in certain situations.

Notice that `.pane` and `.slider` elements are *not generated/added* for devices that support iOS native scrolling when `iOSNativeScrolling` option is enabled.

__Default:__ false

```js
$(".nano").nanoScroller({ iOSNativeScrolling: true });
```

#### sliderMinHeight

Sets the minimum height of the slider element.

__Default:__ 20

```js
$(".nano").nanoScroller({ sliderMinHeight: 40 });
```

#### sliderMaxHeight

Sets the maximum height of the slider element.

__Default:__ null

```js
$(".nano").nanoScroller({ sliderMaxHeight: 200 });
```

#### preventPageScrolling

Set to true to prevent page scrolling when top or bottom inside the content div is reached.

__Default:__ false

```js
$(".nano").nanoScroller({ preventPageScrolling: true });
```

#### disableResize

Set to true to disable the resize from nanoscroller. Useful if you want total control of the resize event. If you set this option to true remember to call the reset method so that the scroll don't have strange behavior.

__Default:__ false

```js
$(".nano").nanoScroller({ disableResize: true });
```

#### alwaysVisible

Set to true to stop the scrollbar from auto-hiding itself.

__Default:__ false

```js
$(".nano").nanoScroller({ alwaysVisible: true });
```

#### flashDelay:

Use this setting to specify the scrollbar hide delay in milliseconds if you have enabled the `flash` option.

```js
$(".nano").nanoScroller({ flashDelay: 1000 });
```

__Default:__ 1500

#### paneClass

A classname for scrollbar track element. If you change this setting, you also have to change it in the plugin's CSS file.

__Default:__ 'nano-pane'

```js
$(".nano").nanoScroller({ paneClass: 'scrollPane' });
```

#### sliderClass

A classname for scrollbar thumb element. If you change this setting, you also have to change it in the plugin's CSS file.

__Default:__ 'nano-slider'

```js
$(".nano").nanoScroller({ sliderClass: 'scrollSlider' });
```

#### contentClass

A classname for your content div. If you change this setting, you also have to change it in the plugin's CSS file.

__Default:__ 'nano-content'

```js
$(".nano").nanoScroller({ contentClass: 'sliderContent' });
```

#### tabIndex

Set the tab order of the scrollable content. Set to -1 to skip over the scrollable content when tabbing.

__Default:__ 0

```js
$(".nano").nanoScroller({ tabIndex: 0 });
```

## How it works

![Fig 1.](https://github.com/jamesflorentino/nanoScrollerJS/raw/master/fig1.png)

The plugin works by creating a scrollbar gadget (with pre-defined css for styling) and then subscribing the `.nano-content`'s scroll events to it. Mouse press and drag events are also subscribed to the `.nano-pane` and `.nano-pane > .nano-slider` to emulate the native scrollbar's mechanism. The system scrollbars are hidden from the viewport (Fig 1). By doing this, we still retain the natural scrolling experience provided by the OS.

We are still working on doing a horizontal scrolling feature. If you're interested in contributing to the project, you are free to fork it and create a pull request.

### Development

To build nanoScroller from source you need the following libraries installed:

* Node.js and npm: [homepage / download](http://nodejs.org/)
* Grunt: [homepage](http://gruntjs.com/) | `npm install -g grunt-cli`

#### How to build & contribute

1. Make sure that you have [Grunt](http://gruntjs.com/) installed.
2. In terminal move to nanoscroller folder and run `npm install` to install all dependencies.
3. Make all Javascript changes in Coffeescript file(s), CSS changes in CSS file(s).
4. run `grunt` to build nanoScroller
5. Make sure that all changes are valid and open a pull request.

#### How to run tests

1. You need to have [PhantomJS](http://phantomjs.org/) installed. On Mac OS X the easiest way is to install [Homebrew](http://mxcl.github.com/homebrew/) and run `brew install phantomjs`.
2. run `grunt test` in terminal

### Browser compatibility

__Tested desktop browsers:__

* IE7+
* Firefox 3+
* Chrome
* Safari 4+
* Opera 11.60+

__Mobile support:__

* iOS 5+ (iPhone, iPad and iPod Touch)
* iOS 4 (*with a polyfill*)
* Android Firefox
* Android 2.2/2.3 native browser (*with a polyfill*)
* Android Opera 11.6 (*with a polyfill*)
* If you see it's broken on other tablets and mobile devices, please file a ticket in the git repo. Along with model name, and OS of the device.

If you find a bug, please report here at the [issues section](https://github.com/jamesflorentino/nanoScrollerJS/issues).

### Using a polyfill for better mobile browser support

You can use [overthrow.js](https://github.com/filamentgroup/Overthrow/) polyfill (~1.5kb minified and gzipped) to make nanoScroller work on many mobile devices. It emulates CSS overflow (overflow: auto;/overflow: scroll;) in devices that are lacking it.

To use overthrow, link to the javascript file in your HTML document...

```html
<script src="overthrow.js"></script>
```

...and add an `overthrow` class to your `content` div.

```html
<div id="about" class="nano">
    <div class="overthrow nano-content"> ... content here ...  </div>
</div>
```

### Contributors

- [jamesflorentino](https://github.com/jamesflorentino)
- [kristerkari](https://github.com/kristerkari)

Other people who have contributed code:

- [weareoutman](https://github.com/weareoutman) #170
- [Sailias](https://github.com/Sailias) #138
- [antonpinchuk](https://github.com/antonpinchuk) #123
- [miljan-aleksic](https://github.com/miljan-aleksic) #144
- [callmevlad](https://github.com/callmevlad) #122
- [bobo76](https://github.com/bobo76) #115
- [mente](https://github.com/mente) #110
- [livskiy](https://github.com/livskiy) #83
- [iStefo](https://github.com/iStefo) #65
- [tahajahangir](https://github.com/tahajahangir) #60
- [n0valyfe](https://github.com/n0valyfe) #57
- [johanbaath](https://github.com/johanbaath) #42
- [marcelombc](https://github.com/marcelombc) #40, #46
- [zacstewart](https://github.com/zacstewart) #30
- [michael-lefebvre](https://github.com/michael-lefebvre) #22, #29
- [AlicanC](https://github.com/AlicanC) #28
- [camerond](https://github.com/camerond) #26
- [jesstelford](https://github.com/jesstelford) #23
- [lluchs](https://github.com/lluchs) #7, #8
- [Dlom](https://github.com/Dlom)

### Credits
- Initially written by [James Florentino](http://jamesflorentino.com) in [CoffeeScript](http://coffeescript.org)
- Released under [MIT License](http://www.opensource.org/licenses/mit-license.php)
