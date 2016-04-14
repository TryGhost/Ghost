import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import PaginationRouteMixin from 'ghost/mixins/pagination-route';

export default AuthenticatedRoute.extend(CurrentUserSettings, PaginationRouteMixin, {

});
