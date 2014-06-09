import setScrollClassName from 'ghost/utils/set-scroll-classname';

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
        el.on('scroll', Ember.run.bind(this, this.checkScroll));
        el.on('scroll', Ember.run.bind(el, setScrollClassName, {
            target: el.closest('.content-list'),
            offset: 10
        }));
    },

    willDestroyElement: function () {
        var el = this.$();
        el.off('scroll');
    }
});

export default PostsListView;
