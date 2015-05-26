import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import styleBody from 'ghost/mixins/style-body';

var SettingsCodeInjectionRoute = AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    classNames: ['settings-view-code'],

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
        this.render('settings/code-injection', {into: 'application'});
    },

    actions: {
        save: function () {
            this.get('controller').send('save');
        }
    }
});

export default SettingsCodeInjectionRoute;
