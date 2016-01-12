import AuthenticatedRoute from 'ghost/routes/authenticated';
import NotFoundHandler from 'ghost/mixins/404-handler';
import ajax from 'ic-ajax';

export default AuthenticatedRoute.extend(NotFoundHandler, {
  model(params) {
    //return ajax(`/ghost/api/v0.1/clients/slug/${params.slug}`)
    return this.store.queryRecord('client', params);
  }
});
