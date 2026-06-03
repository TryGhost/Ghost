import MemberRoute from '../member';

export default class NewMemberRoute extends MemberRoute {
    controllerName = 'member';
    templateName = 'member';

    setupController(controller) {
        super.setupController(...arguments);
        controller.sendWelcomeEmailOnCreate = false;
    }
}
