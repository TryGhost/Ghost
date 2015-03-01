#  @project nanoScrollerJS
#  @url http://jamesflorentino.github.com/nanoScrollerJS/
#  @author James Florentino
#  @contributor Krister Kari

(($, window, document) ->
  "use strict"

  # Default settings

  defaults =
    ###*
      a classname for the pane element.
      @property paneClass
      @type String
      @default 'nano-pane'
    ###
    paneClass: 'nano-pane'

    ###*
      a classname for the slider element.
      @property sliderClass
      @type String
      @default 'nano-slider'
    ###
    sliderClass: 'nano-slider'

    ###*
      a classname for the content element.
      @property contentClass
      @type String
      @default 'nano-content'
    ###
    contentClass: 'nano-content'

    ###*
      a setting to enable native scrolling in iOS devices.
      @property iOSNativeScrolling
      @type Boolean
      @default false
    ###
    iOSNativeScrolling: false

    ###*
      a setting to prevent the rest of the page being
      scrolled when user scrolls the `.content` element.
      @property preventPageScrolling
      @type Boolean
      @default false
    ###
    preventPageScrolling: false

    ###*
      a setting to disable binding to the resize event.
      @property disableResize
      @type Boolean
      @default false
    ###
    disableResize: false

    ###*
      a setting to make the scrollbar always visible.
      @property alwaysVisible
      @type Boolean
      @default false
    ###
    alwaysVisible: false

    ###*
      a default timeout for the `flash()` method.
      @property flashDelay
      @type Number
      @default 1500
    ###
    flashDelay: 1500

    ###*
      a minimum height for the `.slider` element.
      @property sliderMinHeight
      @type Number
      @default 20
    ###
    sliderMinHeight: 20

    ###*
      a maximum height for the `.slider` element.
      @property sliderMaxHeight
      @type Number
      @default null
    ###
    sliderMaxHeight: null

    ###*
      an alternate document context.
      @property documentContext
      @type Document
      @default null
    ###
    documentContext: null

    ###*
      an alternate window context.
      @property windowContext
      @type Window
      @default null
    ###
    windowContext: null

  # Constants

  ###*
    @property SCROLLBAR
    @type String
    @static
    @final
    @private
  ###
  SCROLLBAR = 'scrollbar'

  ###*
    @property SCROLL
    @type String
    @static
    @final
    @private
  ###
  SCROLL = 'scroll'

  ###*
    @property MOUSEDOWN
    @type String
    @final
    @private
  ###
  MOUSEDOWN = 'mousedown'

  ###*
    @property MOUSEENTER
    @type String
    @final
    @private
  ###
  MOUSEENTER = 'mouseenter'

  ###*
    @property MOUSEMOVE
    @type String
    @static
    @final
    @private
  ###
  MOUSEMOVE = 'mousemove'

  ###*
    @property MOUSEWHEEL
    @type String
    @final
    @private
  ###
  MOUSEWHEEL = 'mousewheel'

  ###*
    @property MOUSEUP
    @type String
    @static
    @final
    @private
  ###
  MOUSEUP = 'mouseup'

  ###*
    @property RESIZE
    @type String
    @final
    @private
  ###
  RESIZE = 'resize'

  ###*
    @property DRAG
    @type String
    @static
    @final
    @private
  ###
  DRAG = 'drag'

  ###*
    @property ENTER
    @type String
    @static
    @final
    @private
  ###
  ENTER = 'enter'

  ###*
    @property UP
    @type String
    @static
    @final
    @private
  ###
  UP = 'up'

  ###*
    @property PANEDOWN
    @type String
    @static
    @final
    @private
  ###
  PANEDOWN = 'panedown'

  ###*
    @property DOMSCROLL
    @type String
    @static
    @final
    @private
  ###
  DOMSCROLL  = 'DOMMouseScroll'

  ###*
    @property DOWN
    @type String
    @static
    @final
    @private
  ###
  DOWN = 'down'

  ###*
    @property WHEEL
    @type String
    @static
    @final
    @private
  ###
  WHEEL = 'wheel'

  ###*
    @property KEYDOWN
    @type String
    @static
    @final
    @private
  ###
  KEYDOWN    = 'keydown'

  ###*
    @property KEYUP
    @type String
    @static
    @final
    @private
  ###
  KEYUP = 'keyup'

  ###*
    @property TOUCHMOVE
    @type String
    @static
    @final
    @private
  ###
  TOUCHMOVE = 'touchmove'

  ###*
    @property BROWSER_IS_IE7
    @type Boolean
    @static
    @final
    @private
  ###
  BROWSER_IS_IE7 = window.navigator.appName is 'Microsoft Internet Explorer' and (/msie 7./i).test(window.navigator.appVersion) and window.ActiveXObject

  ###*
    @property BROWSER_SCROLLBAR_WIDTH
    @type Number
    @static
    @default null
    @private
  ###
  BROWSER_SCROLLBAR_WIDTH = null

  rAF = window.requestAnimationFrame
  cAF = window.cancelAnimationFrame

  # this transform stuff is from iScroll.
  # all credit goes to @cubiq
  _elementStyle = document.createElement('div').style

  _vendor = do ->
    vendors = ['t', 'webkitT', 'MozT', 'msT', 'OT']
    for vendor, i in vendors
      transform = vendors[i] + 'ransform';
      if transform of _elementStyle
        return vendors[i].substr(0, vendors[i].length - 1)
    return false

  _prefixStyle = (style) ->
    return false if _vendor is false
    return style if _vendor is ''
    return _vendor + style.charAt(0).toUpperCase() + style.substr(1)

  transform = _prefixStyle('transform')

  hasTransform = transform isnt false

  ###*
    Returns browser's native scrollbar width
    @method getBrowserScrollbarWidth
    @return {Number} the scrollbar width in pixels
    @static
    @private
  ###
  getBrowserScrollbarWidth = ->
    outer = document.createElement 'div'
    outerStyle = outer.style
    outerStyle.position = 'absolute'
    outerStyle.width = '100px'
    outerStyle.height = '100px'
    outerStyle.overflow = SCROLL
    outerStyle.top = '-9999px'
    document.body.appendChild outer
    scrollbarWidth = outer.offsetWidth - outer.clientWidth
    document.body.removeChild outer
    scrollbarWidth

  isFFWithBuggyScrollbar = ->
    ua = window.navigator.userAgent
    isOSXFF = /(?=.+Mac OS X)(?=.+Firefox)/.test(ua)
    return false if not isOSXFF
    version = /Firefox\/\d{2}\./.exec(ua)
    version = version[0].replace(/\D+/g, '') if version
    return isOSXFF and +version > 23

  ###*
    @class NanoScroll
    @param element {HTMLElement|Node} the main element
    @param options {Object} nanoScroller's options
    @constructor
  ###
  class NanoScroll
    constructor: (@el, @options) ->
      BROWSER_SCROLLBAR_WIDTH or= do getBrowserScrollbarWidth
      @$el = $ @el
      @doc = $ @options.documentContext or document
      @win = $ @options.windowContext or window
      @body= @doc.find 'body'
      @$content = @$el.children(".#{options.contentClass}")
      @$content.attr 'tabindex', @options.tabIndex or 0
      @content = @$content[0]

      @previousPosition = 0

      if @options.iOSNativeScrolling && @el.style.WebkitOverflowScrolling?
        do @nativeScrolling
      else
        do @generate
      do @createEvents
      do @addEvents
      do @reset

    ###*
      Prevents the rest of the page being scrolled
      when user scrolls the `.nano-content` element.
      @method preventScrolling
      @param event {Event}
      @param direction {String} Scroll direction (up or down)
      @private
    ###
    preventScrolling: (e, direction) ->
      return unless @isActive
      if e.type is DOMSCROLL # Gecko
        if direction is DOWN and e.originalEvent.detail > 0 or direction is UP and e.originalEvent.detail < 0
          do e.preventDefault
      else if e.type is MOUSEWHEEL # WebKit, Trident and Presto
        return if not e.originalEvent or not e.originalEvent.wheelDelta
        if direction is DOWN and e.originalEvent.wheelDelta < 0 or direction is UP and e.originalEvent.wheelDelta > 0
          do e.preventDefault
      return

    ###*
      Enable iOS native scrolling
      @method nativeScrolling
      @private
    ####
    nativeScrolling: ->
      # simply enable container
      @$content.css {WebkitOverflowScrolling: 'touch'}
      @iOSNativeScrolling = true
      # we are always active
      @isActive = true
      return

    ###*
      Updates those nanoScroller properties that
      are related to current scrollbar position.
      @method updateScrollValues
      @private
    ###
    updateScrollValues: ->
      content = @content
      # Formula/ratio
      # `scrollTop / maxScrollTop = sliderTop / maxSliderTop`
      @maxScrollTop = content.scrollHeight - content.clientHeight
      @prevScrollTop = @contentScrollTop or 0
      @contentScrollTop = content.scrollTop

      direction = if @contentScrollTop > @previousPosition 
                    "down"
                  else 
                    if @contentScrollTop < @previousPosition 
                      "up" 
                    else 
                      "same"
      @previousPosition = @contentScrollTop

      @$el.trigger 'update', { position: @contentScrollTop, maximum: @maxScrollTop, direction: direction} unless direction == "same"

      if not @iOSNativeScrolling
        @maxSliderTop = @paneHeight - @sliderHeight
        # `sliderTop = scrollTop / maxScrollTop * maxSliderTop
        @sliderTop = if @maxScrollTop is 0 then 0 else @contentScrollTop * @maxSliderTop / @maxScrollTop
      return

    ###*
      Updates CSS styles for current scroll position.
      Uses CSS 2d transfroms and `window.requestAnimationFrame` if available.
      @method setOnScrollStyles
      @private
    ###
    setOnScrollStyles: ->
      if hasTransform
        cssValue = {}
        cssValue[transform] = "translate(0, #{@sliderTop}px)"
      else
        cssValue = top: @sliderTop

      if rAF
        cAF(@scrollRAF) if cAF and @scrollRAF
        @scrollRAF = rAF =>
          @scrollRAF = null
          @slider.css cssValue
      else
        @slider.css cssValue
      return

    ###*
      Creates event related methods
      @method createEvents
      @private
    ###
    createEvents: ->
      @events =
        down: (e) =>
          @isBeingDragged  = true
          @offsetY = e.pageY - @slider.offset().top
          @offsetY = 0 unless @slider.is e.target
          @pane.addClass 'active'
          @doc
            .bind(MOUSEMOVE, @events[DRAG])
            .bind(MOUSEUP, @events[UP])

          @body.bind(MOUSEENTER, @events[ENTER])
          false

        drag: (e) =>
          @sliderY = e.pageY - @$el.offset().top - @paneTop - (@offsetY or @sliderHeight * 0.5)
          do @scroll
          if @contentScrollTop >= @maxScrollTop and @prevScrollTop isnt @maxScrollTop
            @$el.trigger 'scrollend'
          else if @contentScrollTop is 0 and @prevScrollTop isnt 0
            @$el.trigger 'scrolltop'
          false

        up: (e) =>
          @isBeingDragged = false
          @pane.removeClass 'active'
          @doc
            .unbind(MOUSEMOVE, @events[DRAG])
            .unbind(MOUSEUP, @events[UP])

          @body.unbind(MOUSEENTER, @events[ENTER])
          false

        resize: (e) =>
          do @reset
          return

        panedown: (e) =>
          @sliderY = (e.offsetY or e.originalEvent.layerY) - (@sliderHeight * 0.5)
          do @scroll
          @events.down e
          false

        scroll: (e) =>
          do @updateScrollValues
          # Don't operate if there is a dragging mechanism going on.
          # This is invoked when a user presses and moves the slider or pane
          return if @isBeingDragged
          if not @iOSNativeScrolling
            # update the slider position
            @sliderY = @sliderTop
            do @setOnScrollStyles

          # the succeeding code should be ignored if @events.scroll() wasn't
          # invoked by a DOM event. (refer to @reset)
          return unless e?
          # if it reaches the maximum and minimum scrolling point,
          # we dispatch an event.
          if @contentScrollTop >= @maxScrollTop
            @preventScrolling(e, DOWN) if @options.preventPageScrolling
            @$el.trigger 'scrollend' if @prevScrollTop isnt @maxScrollTop
          else if @contentScrollTop is 0
            @preventScrolling(e, UP) if @options.preventPageScrolling
            @$el.trigger 'scrolltop' if @prevScrollTop isnt 0
          return

        wheel: (e) =>
          return unless e?
          delta = e.delta or e.wheelDelta or (e.originalEvent and e.originalEvent.wheelDelta) or -e.detail or (e.originalEvent and -e.originalEvent.detail)
          @sliderY += -delta / 3 if delta
          do @scroll
          false

        enter: (e) =>
          return unless @isBeingDragged
          @events[UP] arguments... if (e.buttons or e.which) isnt 1

      return

    ###*
      Adds event listeners with jQuery.
      @method addEvents
      @private
    ###
    addEvents: ->
      do @removeEvents
      events = @events
      if not @options.disableResize
        @win
          .bind RESIZE, events[RESIZE]
      if not @iOSNativeScrolling
        @slider
          .bind MOUSEDOWN, events[DOWN]
        @pane
          .bind(MOUSEDOWN, events[PANEDOWN])
          .bind("#{MOUSEWHEEL} #{DOMSCROLL}", events[WHEEL])
      @$content
        .bind("#{SCROLL} #{MOUSEWHEEL} #{DOMSCROLL} #{TOUCHMOVE}", events[SCROLL])
      return

    ###*
      Removes event listeners with jQuery.
      @method removeEvents
      @private
    ###
    removeEvents: ->
      events = @events
      @win
        .unbind(RESIZE, events[RESIZE])
      if not @iOSNativeScrolling
        do @slider.unbind
        do @pane.unbind
      @$content
        .unbind("#{SCROLL} #{MOUSEWHEEL} #{DOMSCROLL} #{TOUCHMOVE}", events[SCROLL])
      return

    ###*
      Generates nanoScroller's scrollbar and elements for it.
      @method generate
      @chainable
      @private
    ###
    generate: ->
      # For reference:
      # http://msdn.microsoft.com/en-us/library/windows/desktop/bb787527(v=vs.85).aspx#parts_of_scroll_bar
      options = @options
      {paneClass, sliderClass, contentClass} = options
      if not (pane = @$el.children(".#{paneClass}")).length and not pane.children(".#{sliderClass}").length
        @$el.append """<div class="#{paneClass}"><div class="#{sliderClass}" /></div>"""

      # pane is the name for the actual scrollbar.
      @pane = @$el.children ".#{paneClass}"

      # slider is the name for the  scrollbox or thumb of the scrollbar gadget
      @slider = @pane.find ".#{sliderClass}"

      if BROWSER_SCROLLBAR_WIDTH is 0 and do isFFWithBuggyScrollbar
        currentPadding = window.getComputedStyle(@content,null).getPropertyValue('padding-right').replace(/[^0-9.]+/g, '')
        cssRule =
          right: -14
          paddingRight: +currentPadding + 14
      else if BROWSER_SCROLLBAR_WIDTH
        cssRule = right: -BROWSER_SCROLLBAR_WIDTH
        @$el.addClass 'has-scrollbar'

      @$content.css cssRule if cssRule?

      this

    ###*
      @method restore
      @private
    ###
    restore: ->
      @stopped = false
      do @pane.show if not @iOSNativeScrolling
      do @addEvents
      return

    ###*
      Resets nanoScroller's scrollbar.
      @method reset
      @chainable
      @example
          $(".nano").nanoScroller();
    ###
    reset: ->
      if @iOSNativeScrolling
        @contentHeight = @content.scrollHeight
        return
      @generate().stop() if not @$el.find(".#{@options.paneClass}").length
      do @restore if @stopped
      content = @content
      contentStyle = content.style
      contentStyleOverflowY = contentStyle.overflowY

      # try to detect IE7 and IE7 compatibility mode.
      # this sniffing is done to fix a IE7 related bug.
      @$content.css height: do @$content.height if BROWSER_IS_IE7

      # set the scrollbar UI's height
      # the target content
      contentHeight = content.scrollHeight + BROWSER_SCROLLBAR_WIDTH

      # Handle using max-height on the parent @$el and not
      # setting the height explicitly
      parentMaxHeight = parseInt(@$el.css("max-height"), 10)
      if parentMaxHeight > 0
        @$el.height("")
        @$el.height(if content.scrollHeight > parentMaxHeight then parentMaxHeight else content.scrollHeight)

      # set the pane's height.
      paneHeight = @pane.outerHeight(false)
      paneTop = parseInt @pane.css('top'), 10
      paneBottom = parseInt @pane.css('bottom'), 10
      paneOuterHeight = paneHeight + paneTop + paneBottom

      # set the slider's height
      sliderHeight = Math.round paneOuterHeight / contentHeight * paneOuterHeight
      if sliderHeight < @options.sliderMinHeight
        sliderHeight = @options.sliderMinHeight # set min height
      else if @options.sliderMaxHeight? and sliderHeight > @options.sliderMaxHeight
        sliderHeight = @options.sliderMaxHeight # set max height
      sliderHeight += BROWSER_SCROLLBAR_WIDTH if contentStyleOverflowY is SCROLL and contentStyle.overflowX isnt SCROLL

      # the maximum top value for the slider
      @maxSliderTop = paneOuterHeight - sliderHeight

      # set into properties for further use
      @contentHeight = contentHeight
      @paneHeight = paneHeight
      @paneOuterHeight = paneOuterHeight
      @sliderHeight = sliderHeight
      @paneTop = paneTop

      # set the values to the gadget
      @slider.height sliderHeight

      # scroll sets the position of the @slider
      do @events.scroll

      do @pane.show
      @isActive = true
      if (content.scrollHeight is content.clientHeight) or (
          @pane.outerHeight(true) >= content.scrollHeight and contentStyleOverflowY isnt SCROLL)
        do @pane.hide
        @isActive = false
      else if @el.clientHeight is content.scrollHeight and contentStyleOverflowY is SCROLL
        do @slider.hide
      else
        do @slider.show

      # allow the pane element to stay visible
      @pane.css
        opacity: (if @options.alwaysVisible then 1 else '')
        visibility: (if @options.alwaysVisible then 'visible' else '')

      contentPosition = @$content.css('position')

      if contentPosition is 'static' or contentPosition is 'relative'
        right = parseInt(@$content.css('right'), 10)

        if right
          @$content.css
            right: ''
            marginRight: right

      this

    ###*
      @method scroll
      @private
      @example
          $(".nano").nanoScroller({ scroll: 'top' });
    ###
    scroll: ->
      return unless @isActive
      @sliderY = Math.max 0, @sliderY
      @sliderY = Math.min @maxSliderTop, @sliderY
      @$content.scrollTop @maxScrollTop * @sliderY / @maxSliderTop
      if not @iOSNativeScrolling
        do @updateScrollValues
        do @setOnScrollStyles
      this

    ###*
      Scroll at the bottom with an offset value
      @method scrollBottom
      @param offsetY {Number}
      @chainable
      @example
          $(".nano").nanoScroller({ scrollBottom: value });
    ###
    scrollBottom: (offsetY) ->
      return unless @isActive
      @$content.scrollTop(@contentHeight - @$content.height() - offsetY).trigger(MOUSEWHEEL) # Update scrollbar position by triggering one of the scroll events
      @stop().restore()
      this

    ###*
      Scroll at the top with an offset value
      @method scrollTop
      @param offsetY {Number}
      @chainable
      @example
          $(".nano").nanoScroller({ scrollTop: value });
    ###
    scrollTop: (offsetY) ->
      return unless @isActive
      @$content.scrollTop(+offsetY).trigger(MOUSEWHEEL) # Update scrollbar position by triggering one of the scroll events
      @stop().restore()
      this

    ###*
      Scroll to an element
      @method scrollTo
      @param node {Node} A node to scroll to.
      @chainable
      @example
          $(".nano").nanoScroller({ scrollTo: $('#a_node') });
    ###
    scrollTo: (node) ->
      return unless @isActive
      @scrollTop @$el.find(node).get(0).offsetTop
      this

    ###*
      To stop the operation.
      This option will tell the plugin to disable all event bindings and hide the gadget scrollbar from the UI.
      @method stop
      @chainable
      @example
          $(".nano").nanoScroller({ stop: true });
    ###
    stop: ->
      if cAF and @scrollRAF
        cAF(@scrollRAF)
        @scrollRAF = null
      @stopped = true
      do @removeEvents
      do @pane.hide if not @iOSNativeScrolling
      this

    ###*
      Destroys nanoScroller and restores browser's native scrollbar.
      @method destroy
      @chainable
      @example
          $(".nano").nanoScroller({ destroy: true });
    ###
    destroy: ->
      do @stop if not @stopped
      do @pane.remove if not @iOSNativeScrolling and @pane.length
      @$content.height '' if BROWSER_IS_IE7
      @$content.removeAttr 'tabindex'
      if @$el.hasClass('has-scrollbar')
        @$el.removeClass('has-scrollbar')
        @$content.css right: ''
      this

    ###*
      To flash the scrollbar gadget for an amount of time defined in plugin settings (defaults to 1,5s).
      Useful if you want to show the user (e.g. on pageload) that there is more content waiting for him.
      @method flash
      @chainable
      @example
          $(".nano").nanoScroller({ flash: true });
    ###
    flash: ->
      return if @iOSNativeScrolling
      return unless @isActive
      do @reset
      @pane.addClass 'flashed'
      setTimeout =>
        @pane.removeClass 'flashed'
        return
      , @options.flashDelay
      this

  $.fn.nanoScroller = (settings) ->
    @each ->
      if not scrollbar = @nanoscroller
        options = $.extend {}, defaults, settings
        @nanoscroller = scrollbar = new NanoScroll this, options

      # scrollbar settings
      if settings and typeof settings is "object"
        $.extend scrollbar.options, settings # update scrollbar settings
        return scrollbar.scrollBottom settings.scrollBottom if settings.scrollBottom?
        return scrollbar.scrollTop settings.scrollTop if settings.scrollTop?
        return scrollbar.scrollTo settings.scrollTo if settings.scrollTo
        return scrollbar.scrollBottom 0 if settings.scroll is 'bottom'
        return scrollbar.scrollTop 0 if settings.scroll is 'top'
        return scrollbar.scrollTo settings.scroll if settings.scroll and settings.scroll instanceof $
        return do scrollbar.stop if settings.stop
        return do scrollbar.destroy if settings.destroy
        return do scrollbar.flash if settings.flash

      do scrollbar.reset

  $.fn.nanoScroller.Constructor = NanoScroll
  return

)(jQuery, window, document)
