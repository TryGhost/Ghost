import Ember from 'ember';
import InfiniteScrollMixin from 'ghost/mixins/infinite-scroll';
import setScrollClassName from 'ghost/utils/set-scroll-classname';

const {Component, run} = Ember;

export default Component.extend(InfiniteScrollMixin, {
    didInsertElement() {
        let el = this.$();

        this._super(...arguments);

        el.on('scroll', run.bind(el, setScrollClassName, {
            target: el.closest('.content-list'),
            offset: 10
        }));
    },

    willDestroyElement() {
        this._super(...arguments);
        this.$().off('scroll');
    }
});
