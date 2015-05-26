import AuthenticatedRoute from 'ghost/routes/authenticated';
import styleBody from 'ghost/mixins/style-body';

var SettingsAboutRoute = AuthenticatedRoute.extend(styleBody, {
    beforeModel: function () {
        this.transitionTo('about');
    }
});

export default SettingsAboutRoute;
