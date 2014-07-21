import setScrollClassName from 'ghost/utils/set-scroll-classname';
import PaginationViewMixin from 'ghost/mixins/pagination-view-infinite-scroll';


var PostsListView = Ember.View.extend(PaginationViewMixin, {
    classNames: ['content-list-content'],

    didInsertElement: function () {
        this._super();
        var el = this.$();
        el.on('scroll', Ember.run.bind(el, setScrollClassName, {
            target: el.closest('.content-list'),
            offset: 10
        }));
    }
});

export default PostsListView;
