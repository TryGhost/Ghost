import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default class LaunchIndexRoute extends AuthenticatedRoute {
    beforeModel() {
        this.transitionTo('launch.customise-design');
    }
}
