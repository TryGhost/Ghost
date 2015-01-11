import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';

var NavigationRoute = AuthenticatedRoute.extend(CurrentUserSettings, {

    titleToken: 'Navigation',

    beforeModel: function () {
        if (!this.get('config.navigationUI')) {
            return this.transitionTo('settings.general');
        }

        return this.currentUser().then(this.transitionAuthor());
    },

    model: function () {
        return this.store.find('setting', {type: 'blog,theme'}).then(function (records) {
            return records.get('firstObject');
        });
    },

    setupController: function (controller, model) {
        this._super(controller, model);
    }
});

export default NavigationRoute;
