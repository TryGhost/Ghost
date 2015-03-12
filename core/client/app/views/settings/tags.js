import BaseView from 'ghost/views/settings/content-base';
import PaginationScrollMixin from 'ghost/mixins/pagination-view-infinite-scroll';

var SettingsTagsView = BaseView.extend(PaginationScrollMixin);

export default SettingsTagsView;
