import Ember from 'ember';
import InfiniteScrollMixin from 'ghost/mixins/infinite-scroll';
import setScrollClassName from 'ghost/utils/set-scroll-classname';

export default Ember.Component.extend(InfiniteScrollMixin, {
    didRender: function () {
        this._super();

        var el = this.$();

        el.on('scroll', Ember.run.bind(el, setScrollClassName, {
            target: el.closest('.content-list'),
            offset: 10
        }));
    },

    willDestroyElement: function () {
        this._super();

        this.$().off('scroll');
    }
});
