import Ember from 'ember';
import InfiniteScrollMixin from 'ghost/mixins/infinite-scroll';

const {Component} = Ember;

export default Component.extend(InfiniteScrollMixin, {
    actions: {
        checkScroll() {
            this._checkScroll();
        }
    }
});
