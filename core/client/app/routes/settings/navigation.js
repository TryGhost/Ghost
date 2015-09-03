import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import styleBody from 'ghost/mixins/style-body';

var NavigationRoute = AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    titleToken: 'Settings - Navigation',

    classNames: ['settings-view-navigation'],

    beforeModel: function (transition) {
        this._super(transition);
        return this.get('session.user')
            .then(this.transitionAuthor());
    },

    model: function () {
        return this.store.find('setting', {type: 'blog,theme'}).then(function (records) {
            return records.get('firstObject');
        });
    },

    actions: {
        save: function () {
            // since shortcuts are run on the route, we have to signal to the components
            // on the page that we're about to save.
            $('.page-actions .btn-blue').focus();

            this.get('controller').send('save');
        }
    }
});

export default NavigationRoute;
