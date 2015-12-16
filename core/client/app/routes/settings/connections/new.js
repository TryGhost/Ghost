import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import PaginationRouteMixin from 'ghost/mixins/pagination-route';
import styleBody from 'ghost/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, PaginationRouteMixin, {

});
