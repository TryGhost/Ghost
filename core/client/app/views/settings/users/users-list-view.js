import PaginationViewMixin from 'ghost/mixins/pagination-view-infinite-scroll';

var UsersListView = Ember.View.extend(PaginationViewMixin, {
    classNames: ['js-users-list-view']
});

export default UsersListView;
