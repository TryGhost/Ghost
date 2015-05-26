import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import styleBody from 'ghost/mixins/style-body';

var SettingsGeneralRoute = AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    titleToken: 'General',

    classNames: ['settings-view-general'],

    beforeModel: function () {
        return this.get('session.user')
            .then(this.transitionAuthor())
            .then(this.transitionEditor());
    },

    model: function () {
        return this.store.find('setting', {type: 'blog,theme'}).then(function (records) {
            return records.get('firstObject');
        });
    },

    renderTemplate: function () {
        this.render('settings/general', {into: 'application'});
    },

    actions: {
        save: function () {
            this.get('controller').send('save');
        }
    }
});

export default SettingsGeneralRoute;
