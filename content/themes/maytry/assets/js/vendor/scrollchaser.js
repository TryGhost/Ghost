/*!
 * jQuery.scrollChaser.js
 *
 * Repositiory: https://github.com/yuku-t/jquery-scrollchaser
 * License:     MIT
 * Author:      Yuku Takahashi
 */

;(function ($) {

  'use strict';

  var $window = $(window);
  var MIN_SCROLL_HEIGHT = 50;

  var throttle = function (func, context, wait) {
    var previous = 0;
    return function () {
      var now, remaining;
      now = new Date();
      remaining = wait - (now - previous);
      if (remaining <= 0) {
        previous = now;
        return func.apply(context, arguments);
      }
    };
  };

  var index = 0;
  var cache = function (func) {
    var key = (index++).toString();
    return function () {
      if (!this.cache[key]) {
        this.cache[key] = func.apply(this);
      }
      return this.cache[key];
    };
  };

  var ScrollChaser = (function () {

    function ScrollChaser($el, options) {
      this.$el = $el;
      this.$el.css({width: this.$el.width()});
      this.$wrapper = options.wrapper;
      if (this.$wrapper.css('position') === 'static') {
        this.$wrapper.css('position', 'relative');
      }
      this.sentinel = $('<div></div>').css({
        position: options.ignore ? 'absolute' : 'relative',
        top: 0,
        height: 0
      });
      this.$el.before(this.sentinel);
      this.offsetTop = options.offsetTop || 0;
      this.offsetBottom = options.offsetBottom || 0;
      this.position = options.position || 'top';
      this.ignore = options.ignore;  // Ignore other sidebar contents
      this.absolute = options.absolute;  // Ignore other sidebar contents
      if (this.ignore) {
        this.$el.css({position: 'absolute', top: 0});
      }
      this.handler = throttle(
          this.position == 'bottom' ? this.onScrollBottom : this.onScrollTop,
          this, options.throttle || 10
      );
      $window.on('scroll', this.handler);
      $window.on('resize', this.handler);

      this.handler();
    }

    $.extend(ScrollChaser.prototype, {
      state: 'top',  // top, fixed or bottom
      same: false,   // Sidebar has same height with wrapper

      onScrollTop: function () {
        this.cache = {};  // cache clear

        if (!this.ignore && (this.same || this.state === 'top' && this.isSameHeight())) {
          this.same = true;
          return;
        }

        var state, offset = this.getScrollTop() + this.offsetTop;
        if (offset < this.getSentinelTop()) {
          state = 'top';
        } else if (offset + this.getOuterHeight() > this.getSentinelBottom()) {
          state = 'bottom';
        } else {
          state = 'fixed';
        }
        if (this.state === state && state === 'fixed') return;
        this.transferTo(state);
      },

      onScrollBottom: function () {
        this.cache = {};  // cache clear

        if (!this.ignore && (this.same || this.state === 'top' && this.isSameHeight())) {
          this.same = true;
          return;
        }

        var state, offset;
        offset = this.getScrollTop() + $window.height();
        if (offset > this.getSentinelBottom()) {
          state = 'bottom';
        } else if (offset - this.getOuterHeight() < this.getSentinelTop()) {
          state = 'top';
        } else {
          state = 'fixed';
        }
        if (this.state === state && state === 'fixed') return;
        this.transferTo(state);
      },

      // State transition method
      transferTo: function (state) {
        this.state = state;
        var prop;
        if (this.state === 'top') {
          prop = {
            position: (this.absolute || this.ignore) ? 'absolute' : 'relative',
            top: 0,
            bottom: ''
          };
        } else if (this.state === 'bottom') {
          prop = {
            position: 'absolute',
            top: this.getWrapperHeight() - this.getOuterHeight(),
            bottom: ''
          };
        } else {
          if (this.position === 'bottom') {
            prop = {position: 'fixed', top: '', bottom: this.offsetBottom};
          } else {
            prop = {position: 'fixed', top: this.offsetTop, bottom: ''};
          }
        }
        this.$el.css(prop);
      },

      isSameHeight: function () {
        return this.getSentinelBottom() - this.getBottom() - this.offsetBottom < MIN_SCROLL_HEIGHT;
      },

      // Getter methods
      // --------------

      getScrollTop: cache(function () {
        return $window.scrollTop();
      }),

      getWrapperHeight: cache(function () {
        return this.$wrapper.outerHeight();
      }),

      getOuterHeight: cache(function () {
        return this.$el.outerHeight(true) + this.offsetBottom;
      }),

      getSentinelTop: cache(function () {
        return this.sentinel.offset().top;
      }),

      getSentinelBottom: cache(function () {
        return this.$wrapper.offset().top + this.getWrapperHeight() +
            parseInt(this.$wrapper.css('margin-top'), 10);
      }),

      getBottom: cache(function () {
        return this.$el.offset().top + this.getOuterHeight();
      }),

      //

      destroy: function () {
        if (!this.$el) return;  // already destroyed
        this.transferTo('top');
        this.$el = this.$wrapper = null;
        $window.off('scroll', this.handler);
        $window.off('resize', this.handler);
      }
    });

    return ScrollChaser;
  })();

  $.fn.scrollChaser = function (options) {
    options || (options = {});
    if (!options.wrapper) {
      options.wrapper = $(document.body);
    } else if (!(options.wrapper instanceof $)) {
      options.wrapper = $(options.wrapper);
    }
    this.scrollChaser = new ScrollChaser(this, options);
    var that = this, origRemove = this.remove;

    // Destroy scroll chaser when it is removed from DOM tree.
    this.remove = function () {
      that.scrollChaser.destroy();  // Prevent memory leak
      origRemove.apply(that, arguments);
    };
    return this;
  };

  if (!$.fn.outerHeight) {
    // Zepto does not have $.fn.outerHeight
    $.fn.outerHeight = function (includeMargin) {
      var size = this.height();
      if (!includeMargin) {
        size -= parseInt(this.css('margin-bottom'), 10);
        size -= parseInt(this.css('margin-top'), 10);
      }
      return size;
    };
  }

})(window.jQuery || window.Zepto);