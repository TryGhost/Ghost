import Ember from 'ember';

import setScrollClassName from 'ghost/utils/set-scroll-classname';

var EditorScroll = Ember.Mixin.create({
    /**
     * Determine if the cursor is at the end of the textarea
     */
    isCursorAtEnd: function () {
        var selection = this.$().getSelection(),
            value = this.getValue(),
            linesAtEnd = 3,
            stringAfterCursor,
            match;

        stringAfterCursor = value.substring(selection.end);
        /* jscs: disable */
        match = stringAfterCursor.match(/\n/g);
        /* jscs: enable */

        if (!match || match.length < linesAtEnd) {
            return true;
        }

        return false;
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
                isCursorAtEnd: this.isCursorAtEnd()
            };

        return scrollInfo;
    },

    /**
     * Calculate if we're within scrollInfo.padding of the end of the document, and scroll the rest of the way
     */
    adjustScrollPosition: function () {
        // If we're receiving change events from the end of the document, i.e the user is typing-at-the-end, update the
        // scroll position to ensure both panels stay in view and in sync
        var scrollInfo = this.getScrollInfo();
        if (scrollInfo.isCursorAtEnd && (scrollInfo.diff >= scrollInfo.top) &&
            (scrollInfo.diff < scrollInfo.top + scrollInfo.padding)) {
            scrollInfo.top += scrollInfo.padding;
            // Scroll the left pane
            this.$().scrollTop(scrollInfo.top);
        }
    },

    /**
     * Send the scrollInfo for scrollEvents to the view so that the preview pane can be synced
     */
    scrollHandler: function () {
        this.set('scrollThrottle', Ember.run.throttle(this, function () {
            this.sendAction('updateScrollInfo', this.getScrollInfo());
        }, 10));
    },

    /**
     * once the element is in the DOM bind to the events which control scroll behaviour
     */
    attachScrollHandlers: function () {
        var $el = this.$();

        $el.on('keypress', Ember.run.bind(this, this.adjustScrollPosition));

        $el.on('scroll', Ember.run.bind(this, this.scrollHandler));
        $el.on('scroll', Ember.run.bind($el, setScrollClassName, {
            target: Ember.$('.js-entry-markdown'),
            offset: 10
        }));
    },

    /**
     * once the element has been removed from the DOM unbind from the events which control scroll behaviour
     */
    detachScrollHandlers: function () {
        this.$().off('keypress');
        this.$().off('scroll');
        Ember.run.cancel(this.get('scrollThrottle'));
    },

    didInsertElement: function () {
        this._super();

        this.attachScrollHandlers();
    },

    willDestroyElement: function () {
        this._super();

        this.detachScrollHandlers();
    }
});

export default EditorScroll;
