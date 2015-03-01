# Device.js
# (c) 2014 Matthew Hudson
# Device.js is freely distributable under the MIT license.
# For all details and documentation:
# http://matthewhudson.me/projects/device.js/

# Save the previous value of the device variable.
previousDevice = window.device

# Add device as a global object.
window.device = {}

# The <html> element.
_doc_element = window.document.documentElement

# The client user agent string.
# Lowercase, so we can use the more efficient indexOf(), instead of Regex
_user_agent = window.navigator.userAgent.toLowerCase()


# Main functions
# --------------

device.ios = ->
  device.iphone() or device.ipod() or device.ipad()

device.iphone = ->
  _find 'iphone'

device.ipod = ->
  _find 'ipod'

device.ipad = ->
  _find 'ipad'

device.android = ->
  _find 'android'

device.androidPhone = ->
  device.android() and _find 'mobile'

# See: http://android-developers.blogspot.com/2010/12/android-browser-user-agent-issues.html
device.androidTablet = ->
  device.android() and not _find 'mobile'

device.blackberry = ->
  _find('blackberry') or _find('bb10') or _find('rim')

device.blackberryPhone = ->
  device.blackberry() and not _find 'tablet'

# See: http://supportforums.blackberry.com/t5/Web-and-WebWorks-Development/How-to-detect-the-BlackBerry-Browser/ta-p/559862
device.blackberryTablet = ->
  device.blackberry() and _find 'tablet'

device.windows = ->
  _find 'windows'

device.windowsPhone = ->
  device.windows() and _find 'phone'

device.windowsTablet = ->
  device.windows() and _find 'touch'

device.fxos = ->
  (_find('(mobile;') or _find('(tablet;')) and _find('; rv:')

device.fxosPhone = ->
  device.fxos() and _find 'mobile'

device.fxosTablet = ->
  device.fxos() and _find 'tablet'

device.meego = ->
  _find 'meego'

device.cordova = ->
  window.cordova && location.protocol == 'file:'

device.mobile = ->
  device.androidPhone() or device.iphone() or device.ipod() or device.windowsPhone() or device.blackberryPhone() or device.fxosPhone() or device.meego()

device.tablet = ->
  device.ipad() or device.androidTablet() or device.blackberryTablet() or device.windowsTablet() or device.fxosTablet()

device.desktop = ->
  not device.tablet() and not device.mobile()

device.portrait = ->
  (window.innerHeight/window.innerWidth) > 1

device.landscape = ->
  (window.innerHeight/window.innerWidth) < 1

# Run device.js in noConflict mode, returning the device variable to its previous owner.
# Returns a reference to the device object.
device.noConflict = ->
  window.device = previousDevice
  @

# Private Utility
# ---------------

# Simple UA string search
_find = (needle) ->
  _user_agent.indexOf(needle) isnt -1

# Check if docElement already has a given class.
_hasClass = (class_name) ->
  regex = new RegExp class_name, 'i'
  _doc_element.className.match regex

# Add one or more CSS classes to the <html> element.
_addClass = (class_name) ->
  if not _hasClass class_name
    _doc_element.className += " " + class_name

# Remove single CSS class from the <html> element.
_removeClass = (class_name) ->
  if _hasClass class_name
    _doc_element.className = _doc_element.className.replace class_name, ""


# HTML Element Handling
# ---------------------

# Insert the appropriate CSS class based on the _user_agent.
if device.ios()
  if device.ipad()
    _addClass "ios ipad tablet"
  else if device.iphone()
    _addClass "ios iphone mobile"
  else if device.ipod()
    _addClass "ios ipod mobile"

else if device.android()
  if device.androidTablet()
    _addClass "android tablet"
  else
    _addClass "android mobile"

else if device.blackberry()
  if device.blackberryTablet()
    _addClass "blackberry tablet"
  else
    _addClass "blackberry mobile"

else if device.windows()
  if device.windowsTablet()
    _addClass "windows tablet"
  else if device.windowsPhone()
    _addClass "windows mobile"
  else
    _addClass "desktop"

else if device.fxos()
  if device.fxosTablet()
    _addClass "fxos tablet"
  else
    _addClass "fxos mobile"

else if device.meego()
  _addClass "meego mobile"

else
  _addClass "desktop"

if device.cordova()
  _addClass "cordova"


# Orientation Handling
# --------------------

# Handle device orientation changes
_handleOrientation = ->
  if device.landscape()
    _removeClass "portrait"
    _addClass "landscape"
  else
    _removeClass "landscape"
    _addClass "portrait"

# Detect whether device supports orientationchange event,
# otherwise fall back to the resize event.
_supports_orientation = "onorientationchange" of window
_orientation_event = if _supports_orientation then "orientationchange" else "resize"

# Listen for changes in orientation.
if window.addEventListener
  window.addEventListener _orientation_event, _handleOrientation, no
else if window.attachEvent
  window.attachEvent _orientation_event, _handleOrientation
else
  window[_orientation_event] = _handleOrientation

_handleOrientation()
