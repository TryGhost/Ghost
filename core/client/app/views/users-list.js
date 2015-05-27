import Ember from 'ember';
import PaginationViewMixin from 'ghost/mixins/pagination-view-infinite-scroll';

export default Ember.View.extend(PaginationViewMixin, {
    tagName: 'section',
    classNames: ['js-users-list-view', 'view-content', 'settings-users']
});
