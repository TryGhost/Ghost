import AuthenticatedRoute from 'ghost/routes/authenticated';
import NotFoundHandler from 'ghost/mixins/404-handler';

export default AuthenticatedRoute.extend(NotFoundHandler, {
  model(params) {
    return this.store.queryRecord('client', params);
  }
});
