var PostsListView = Ember.View.extend({
    classNames: ['content-list-content'],

    checkScroll: function (event) {
        var element = event.target,
            triggerPoint = 100,
            controller = this.get('controller'),
            isLoading = controller.get('isLoading');

        // If we haven't passed our threshold, exit
        if (isLoading || (element.scrollTop + element.clientHeight + triggerPoint <= element.scrollHeight)) {
            return;
        }

        controller.send('loadNextPage');
    },

    didInsertElement: function () {
        var el = this.$();
        el.bind('scroll', Ember.run.bind(this, this.checkScroll));
    },

    willDestroyElement: function () {
        var el = this.$();
        el.unbind('scroll');
    }
});

export default PostsListView;
