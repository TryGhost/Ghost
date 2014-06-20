import AuthenticatedRoute from 'ghost/routes/authenticated';

var SettingsIndexRoute = AuthenticatedRoute.extend({
    redirect: function () {
        this.transitionTo('settings.general');
    }
});

export default SettingsIndexRoute;
