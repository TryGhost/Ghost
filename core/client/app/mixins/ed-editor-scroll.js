import Ember from 'ember';

const {Mixin, run} = Ember;

export default Mixin.create({
    /**
     * Determine if the cursor is at the end of the textarea
     */
    isCursorAtEnd() {
        let selection = this.$().getSelection();
        let value = this.getValue();
        let linesAtEnd = 3;
        let match,
            stringAfterCursor;

        stringAfterCursor = value.substring(selection.end);
        match = stringAfterCursor.match(/\n/g);

        if (!match || match.length < linesAtEnd) {
            return true;
        }

        return false;
    },

    /**
     * Build an object that represents the scroll state
     */
    getScrollInfo() {
        let scroller = this.get('element');
        let scrollInfo = {
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
    adjustScrollPosition() {
        // If we're receiving change events from the end of the document, i.e the user is typing-at-the-end, update the
        // scroll position to ensure both panels stay in view and in sync
        let scrollInfo = this.getScrollInfo();

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
    scrollHandler() {
        this.set('scrollThrottle', run.throttle(this, () => {
            this.attrs.updateScrollInfo(this.getScrollInfo());
        }, 10));
    },

    /**
     * once the element is in the DOM bind to the events which control scroll behaviour
     */
    attachScrollHandlers() {
        let $el = this.$();

        $el.on('keypress', run.bind(this, this.adjustScrollPosition));

        $el.on('scroll', run.bind(this, this.scrollHandler));
    },

    /**
     * once the element has been removed from the DOM unbind from the events which control scroll behaviour
     */
    detachScrollHandlers() {
        this.$().off('keypress');
        this.$().off('scroll');
        run.cancel(this.get('scrollThrottle'));
    },

    didInsertElement() {
        this._super(...arguments);

        this.attachScrollHandlers();
    },

    willDestroyElement() {
        this._super(...arguments);

        this.detachScrollHandlers();
    }
});
