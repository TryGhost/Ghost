import Ember from 'ember';
import setScrollClassName from 'ghost/utils/set-scroll-classname';

var PostContentView = Ember.View.extend({
    classNames: ['content-preview-content'],

    didInsertElement: function () {
        var el = this.$();
        el.on('scroll', Ember.run.bind(el, setScrollClassName, {
            target: el.closest('.content-preview'),
            offset: 10
        }));
    },

    contentObserver: Ember.observer('controller.content', function () {
        var el = this.$();

        if (el) {
            el.closest('.content-preview').scrollTop(0);
        }
    }),

    willDestroyElement: function () {
        var el = this.$();
        el.off('scroll');
    }
});

export default PostContentView;
