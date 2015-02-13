import Ember from 'ember';
import setScrollClassName from 'ghost/utils/set-scroll-classname';
import PaginationViewMixin from 'ghost/mixins/pagination-view-infinite-scroll';

var PaginatedScrollBox = Ember.View.extend(PaginationViewMixin, {
    attachScrollClassHandler: function () {
        var el = this.$();
        el.on('scroll', Ember.run.bind(el, setScrollClassName, {
            target: el.closest('.content-list'),
            offset: 10
        }));
    }.on('didInsertElement'),

    detachScrollClassHandler: function () {
        this.$().off('scroll');
    }.on('willDestroyElement')
});

export default PaginatedScrollBox;
