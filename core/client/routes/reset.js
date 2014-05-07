import styleBody from 'ghost/mixins/style-body';

var ResetRoute = Ember.Route.extend(styleBody, {
    classNames: ['ghost-reset'],
    setupController: function (controller, params) {
        controller.token = params.token;
    }
});

export default ResetRoute;
