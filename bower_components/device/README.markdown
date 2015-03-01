# [DEVICE.JS](http://matthewhudson.me/projects/device.js/)

Device.js makes it easy to write conditional CSS _and/or_ JavaScript based on device operating system (iOS, Android, Blackberry, Windows, Firefox OS, MeeGo), orientation (Portrait vs. Landscape), and type (Tablet vs. Mobile).

[View the Demo &rarr;](http://matthewhudson.me/projects/device.js/)

### EXAMPLES

Device.js inserts CSS classes into the `<html>` element.

#### iPhone

<img src="http://matthewhudson.me/projects/device.js/screenshots/iphone.png" />

#### Android Tablet

<img src="http://matthewhudson.me/projects/device.js/screenshots/android.png" />

#### Blackberry Tablet

<img src="http://matthewhudson.me/projects/device.js/screenshots/blackberry.png" />

### DEVICE SUPPORT

* iOS: iPhone, iPod, iPad
* Android: Phones & Tablets
* Blackberry: Phones & Tablets
* Windows: Phones & Tablets
* Firefox OS: Phones & Tablets

### USAGE

Just include the script. The script then updates the `<html>` section with the [appropriate classes](https://github.com/matthewhudson/device.js#conditional-css) based on the device's characteristics.

``` html
<script src="device.js"></script>
``` 

### CONDITIONAL CSS

The following tables map which CSS classes are added based on device and orientation.

#### Device CSS Class Names

<table>
	<tr>
		<th>Device</th>
		<th>CSS Classes</th>
	</tr>
	<tr>
		<td>iPad</td>
		<td>ios ipad tablet</td>
	</tr>
	<tr>
		<td>iPhone</td>
		<td>ios iphone mobile</td>
	</tr>
	<tr>
		<td>iPod</td>
		<td>ios ipod mobile</td>
	</tr>
	<tr>
		<td>Android Phone</td>
		<td>android mobile</td>
	</tr>
	<tr>
		<td>Android Tablet</td>
		<td>android tablet</td>
	</tr>
	<tr>
		<td>BlackBerry Phone</td>
		<td>blackberry mobile</td>
	</tr>
	<tr>
		<td>BlackBerry Tablet</td>
		<td>blackberry tablet</td>
	</tr>
	<tr>
		<td>Windows Phone</td>
		<td>windows mobile</td>
	</tr>
	<tr>
		<td>Windows Tablet</td>
		<td>windows tablet</td>
	</tr>
	<tr>
		<td>Firefox OS Phone</td>
		<td>fxos mobile</td>
	</tr>
	<tr>
		<td>Firefox OS Tablet</td>
		<td>fxos tablet</td>
	</tr>
	<tr>
		<td>MeeGo</td>
		<td>meego</td>
	</tr>
	<tr>
		<td>Desktop</td>
		<td>desktop</td>
	</tr>
</table>

#### Orientation CSS Class Names

<table>
	<tr>
		<th>Orientation</th>
		<th>CSS Classes</th>
	</tr>
	<tr>
		<td>Landscape</td>
		<td>landscape</td>
	</tr>
	<tr>
		<td>Portrait</td>
		<td>portrait</td>
	</tr>
</table>

### CONDITIONAL JAVASCRIPT

Device.js _also_ includes support for conditional JavaScript, allowing you to write checks on the following device characteristics:

#### Device JavaScript Methods

<table>
	<tr>
		<th>Device</th>
		<th>JavaScript Method</th>
	</tr>
	<tr>
		<td>Mobile</td>
		<td>device.mobile()</td>
	</tr>
	<tr>
		<td>Tablet</td>
		<td>device.tablet()</td>
	</tr>
	<tr>
		<td>Desktop</td>
		<td>device.desktop()</td>
	</tr>
	<tr>
		<td>iOS</td>
		<td>device.ios()</td>
	</tr>
	<tr>
		<td>iPad</td>
		<td>device.ipad()</td>
	</tr>
	<tr>
		<td>iPhone</td>
		<td>device.iphone()</td>
	</tr>
	<tr>
		<td>iPod</td>
		<td>device.ipod()</td>
	</tr>
	<tr>
		<td>Android</td>
		<td>device.android()</td>
	</tr>
	<tr>
		<td>Android Phone</td>
		<td>device.androidPhone()</td>
	</tr>
	<tr>
		<td>Android Tablet</td>
		<td>device.androidTablet()</td>
	</tr>
	<tr>
		<td>BlackBerry</td>
		<td>device.blackberry()</td>
	</tr>
	<tr>
		<td>BlackBerry Phone</td>
		<td>device.blackberryPhone()</td>
	</tr>
	<tr>
		<td>BlackBerry Tablet</td>
		<td>device.blackberryTablet()</td>
	</tr>
	<tr>
		<td>Windows</td>
		<td>device.windows()</td>
	</tr>
	<tr>
		<td>Windows Phone</td>
		<td>device.windowsPhone()</td>
	</tr>
	<tr>
		<td>Windows Tablet</td>
		<td>device.windowsTablet()</td>
	</tr>
	<tr>
		<td>Firefox OS</td>
		<td>device.fxos()</td>
	</tr>
	<tr>
		<td>Firefox OS Phone</td>
		<td>device.fxosPhone()</td>
	</tr>
	<tr>
		<td>Firefox OS Tablet</td>
		<td>device.fxosTablet()</td>
	</tr>
	<tr>
		<td>MeeGo</td>
		<td>device.meego()</td>
	</tr>
</table>

#### Orientation JavaScript Methods

<table>
	<tr>
		<th>Orientation</th>
		<th>JavaScript Method</th>
	</tr>
	<tr>
		<td>Landscape</td>
		<td>device.landscape()</td>
	</tr>
	<tr>
		<td>Portrait</td>
		<td>device.portrait()</td>
	</tr>
</table>

### Utility Methods

#### device.noConflict()

Run device.js in noConflict mode, returning the device variable to its previous owner.
Returns a reference to the device object.

``` javascript
var devicejs = device.noConflict();
```

### BEST PRACTICES

Environment detection has a high rate of misuse. Often times, folks will attempt to work around browser feature support problems by checking for the affected browser and doing something different in response. The preferred solution for those kinds of problems, of course, is to check for the feature, not the browser (ala [Modernizr](http://modernizr.com/)).

However, that common misuse of device detection doesn't mean it should never be done. For example, device.js could be employed to change the interface of your web app such that it uses interaction patterns and UI elements common to the device it's being presented on. Android devices might get a slightly different treatment than Windows or iOS, for instance. Another valid use-case is guiding users to different app stores depending on the device they're using.

In short, check for features when you need features, and check for the browser when you need the browser.

### CONTRIBUTING

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Run `grunt` to automagically compile your changes ([Grunt](http://gruntjs.com/))
4. Make changes to `src/device.coffee`
5. Commit your changes (`git commit -am 'Added some feature'`) - *PLEASE DO NOT COMMIT* `lib/*.js`
6. Push to the branch (`git push origin my-new-feature`)
7. Create new Pull Request
