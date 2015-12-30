import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import PaginationRouteMixin from 'ghost/mixins/pagination-route';
import styleBody from 'ghost/mixins/style-body';
import ajax from 'ic-ajax';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, PaginationRouteMixin, {
  model(params) {
    return ajax(`ghost/api/v0.1/clients/slug/${params.slug}`);
  }
});
