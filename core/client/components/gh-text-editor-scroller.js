import setScrollClassName from 'ghost/utils/set-scroll-classname';

var TextEditorScroller = Ember.Component.extend({

    /**
     * Calculate if we're within scrollInfo.padding of the end of the document, and scroll the rest of the way
     */
    adjustScrollPosition: function () {
        var scrollInfo = this.getScrollInfo();
        if ((scrollInfo.diff >= scrollInfo.top) && (scrollInfo.diff < scrollInfo.top + scrollInfo.padding)) {
            scrollInfo.top += scrollInfo.padding;
            // Scroll the left pane
            this.$().scrollTop(scrollInfo.top);
        }
    },

    /**
     * Build an object that represents the scroll state
     */
    getScrollInfo: function () {
        var scroller = this.get('element'),
            scrollInfo = {
                top: scroller.scrollTop,
                height: scroller.scrollHeight,
                clientHeight: scroller.clientHeight,
                diff: scroller.scrollHeight - scroller.clientHeight,
                padding: 50,
                isCursorAtEnd: this.get('textEditor').isCursorAtEnd()
            };

        return scrollInfo;
    },

    /**
     * Send the scrollInfo for scrollEvents to the view so that the preview pane can be synced
     */
    scrollHandler: function () {
        this.set('scrollThrottle', Ember.run.throttle(this, function () {
            this.set('scrollInfo', this.getScrollInfo());
        }, 10));
    },

    /**
     * Bind to the scroll event once the element is in the DOM
     */
    attachScrollHandler: function () {
        var $el = this.$();

        $el.on('scroll', Ember.run.bind(this, this.scrollHandler));
        $el.on('scroll', Ember.run.bind($el, setScrollClassName, {
            target: Ember.$('.js-entry-markdown'),
            offset: 10
        }));
    }.on('didInsertElement'),

    /**
     * Unbind from the scroll event when the element is no longer in the DOM
     */
    detachScrollHandler: function () {
        this.$().off('scroll');
        Ember.run.cancel(this.get('scrollThrottle'));
    }.on('willDestroyElement')

});

export default TextEditorScroller;
