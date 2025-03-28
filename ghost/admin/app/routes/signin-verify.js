import UnauthenticatedRoute from 'ghost-admin/routes/unauthenticated';

export default class SigninVerifyRoute extends UnauthenticatedRoute {
    setupController(controller) {
        controller.resetData();
    }
}
