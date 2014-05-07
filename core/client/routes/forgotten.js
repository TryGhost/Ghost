import styleBody from 'ghost/mixins/style-body';

var ForgottenRoute = Ember.Route.extend(styleBody, {
    classNames: ['ghost-forgotten']
});

export default ForgottenRoute;
