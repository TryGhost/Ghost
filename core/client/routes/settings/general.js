import AuthenticatedRoute from 'ghost/routes/authenticated';
import loadingIndicator from 'ghost/mixins/loading-indicator';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import styleBody from 'ghost/mixins/style-body';
import ShortcutsRoute from 'ghost/mixins/shortcuts-route';
import ctrlOrCmd from 'ghost/utils/ctrl-or-cmd';

var shortcuts = {},
    SettingsGeneralRoute;

shortcuts[ctrlOrCmd + '+s'] = {action: 'save'};

SettingsGeneralRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, CurrentUserSettings, ShortcutsRoute, {
    titleToken: 'General',

    classNames: ['settings-view-general'],

    beforeModel: function () {
        return this.currentUser()
            .then(this.transitionAuthor())
            .then(this.transitionEditor());
    },

    model: function () {
        return this.store.find('setting', {type: 'blog,theme'}).then(function (records) {
            return records.get('firstObject');
        });
    },

    shortcuts: shortcuts,

    actions: {
        save: function () {
            this.get('controller').send('save');
        }
    }
});

export default SettingsGeneralRoute;
