var PaginationViewInfiniteScrollMixin = Ember.Mixin.create({

    /**
     * Determines if we are past a scroll point where we need to fetch the next page
     * @param {object} event The scroll event
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
    attachCheckScroll: function () {
        var el = this.$(),
            controller = this.get('controller');

        el.on('scroll', Ember.run.bind(this, this.checkScroll));

        if (this.element.scrollHeight <= this.element.clientHeight) {
            controller.send('loadNextPage');
        }
    }.on('didInsertElement'),

    /**
     * Unbind from the scroll event when the element is no longer in the DOM
     */
    detachCheckScroll: function () {
        var el = this.$();
        el.off('scroll');
    }.on('willDestroyElement')
});

export default PaginationViewInfiniteScrollMixin;
