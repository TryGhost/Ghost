import Component from 'ember-component';
import InfiniteScrollMixin from 'ghost-admin/mixins/infinite-scroll';

export default Component.extend(InfiniteScrollMixin, {
    actions: {
        checkScroll() {
            this._checkScroll();
        }
    }
});
