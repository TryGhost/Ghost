var PaginationViewInfiniteScrollMixin = Ember.Mixin.create({

    /**
     * Determines if we are past a scroll point where we need to fetch the next page
     * @param event The scroll event
     */
    checkScroll: function (event) {
        var element = event.target,
            triggerPoint = 100,
            controller = this.get('controller'),
            isLoading = controller.get('isLoading');

        // If we haven't passed our threshold or we are already fetching content, exit
        if (isLoading || (element.scrollTop + element.clientHeight + triggerPoint <= element.scrollHeight)) {
            return;
        }

        controller.send('loadNextPage');
    },

    /**
     * Bind to the scroll event once the element is in the DOM
     */
    didInsertElement: function () {
        var el = this.$();

        el.on('scroll', Ember.run.bind(this, this.checkScroll));
    },

    /**
     * Unbind from the scroll event when the element is no longer in the DOM
     */
    willDestroyElement: function () {
        var el = this.$();
        el.off('scroll');
    }
});

export default PaginationViewInfiniteScrollMixin;
