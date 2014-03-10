import styleBody from 'ghost/mixins/style-body';

var ResetRoute = Ember.Route.extend(styleBody, {
    classNames: ['ghost-reset']
});

export default ResetRoute;
