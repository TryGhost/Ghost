import Ember from 'ember';
import setScrollClassName from 'ghost/utils/set-scroll-classname';
import PaginationViewMixin from 'ghost/mixins/pagination-view-infinite-scroll';

var PaginatedScrollBox = Ember.View.extend(PaginationViewMixin, {
    /**
     * attach the scroll class handler event
     */
    attachScrollClassHandler: function () {
        var el = this.$();
        el.on('scroll', Ember.run.bind(el, setScrollClassName, {
            target: el.closest('.content-list'),
            offset: 10
        }));
    },

    didInsertElement: function () {
        this._super();

        this.attachScrollClassHandler();
    },

    willDestroyElement: function () {
        this._super();

        // removes scroll class handler event
        this.$().off('scroll');
    }
});

export default PaginatedScrollBox;
