import styleBody from 'ghost/mixins/style-body';

var SignupRoute = Ember.Route.extend(styleBody, {
    classNames: ['ghost-signup']
});

export default SignupRoute;
