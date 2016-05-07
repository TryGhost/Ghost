import Ember from 'ember';
import SettingsSaveMixin from 'ghost/mixins/settings-save';
import randomPassword from 'ghost/utils/random-password';

const {
    Controller,
    computed,
    inject: {service},
    observer
} = Ember;

export default Controller.extend(SettingsSaveMixin, {

    showUploadLogoModal: false,
    showUploadCoverModal: false,

    notifications: service(),
    config: service(),

    selectedTheme: computed('model.activeTheme', 'themes', function () {
        let activeTheme = this.get('model.activeTheme');
        let themes = this.get('themes');
        let selectedTheme;

        themes.forEach((theme) => {
            if (theme.name === activeTheme) {
                selectedTheme = theme;
            }
        });

        return selectedTheme;
    }),

    logoImageSource: computed('model.logo', function () {
        return this.get('model.logo') || '';
    }),

    coverImageSource: computed('model.cover', function () {
        return this.get('model.cover') || '';
    }),

    isDatedPermalinks: computed('model.permalinks', {
        set(key, value) {
            this.set('model.permalinks', value ? '/:year/:month/:day/:slug/' : '/:slug/');

            let slugForm = this.get('model.permalinks');
            return slugForm !== '/:slug/';
        },

        get() {
            let slugForm = this.get('model.permalinks');

            return slugForm !== '/:slug/';
        }
    }),

    themes: computed(function () {
        return this.get('model.availableThemes').reduce(function (themes, t) {
            let theme = {};

            theme.name = t.name;
            theme.label = t.package ? `${t.package.name} - ${t.package.version}` : t.name;
            theme.package = t.package;
            theme.active = !!t.active;

            themes.push(theme);

            return themes;
        }, []);
    }).readOnly(),

    generatePassword: observer('model.isPrivate', function () {
        this.get('model.errors').remove('password');
        if (this.get('model.isPrivate') && this.get('model.hasDirtyAttributes')) {
            this.get('model').set('password', randomPassword());
        }
    }),

    facebookUrl: computed('model.facebook', function () {
        return this.get('model.facebook');
    }),

    twitterUrl: computed('model.twitter', function () {
        return this.get('model.twitter');
    }),

    save() {
        let notifications = this.get('notifications');
        let config = this.get('config');

        return this.get('model').save().then((model) => {
            config.set('blogTitle', model.get('title'));

            return model;
        }).catch((error) => {
            if (error) {
                notifications.showAPIError(error, {key: 'settings.save'});
            }
        });
    },

    actions: {
        checkPostsPerPage() {
            let postsPerPage = this.get('model.postsPerPage');

            if (postsPerPage < 1 || postsPerPage > 1000 || isNaN(postsPerPage)) {
                this.set('model.postsPerPage', 5);
            }
        },

        setTheme(theme) {
            this.set('model.activeTheme', theme.name);
        },

        toggleUploadCoverModal() {
            this.toggleProperty('showUploadCoverModal');
        },

        toggleUploadLogoModal() {
            this.toggleProperty('showUploadLogoModal');
        },

        validateFacebookUrl(userInput) {
            let newUrl = userInput.trim();
            let oldUrl = this.get('model.facebook');
            let errMessage = '';

            if (!newUrl) {
                // Clear out the Facebook url
                this.set('model.facebook', '');
                return;
            }

            if (!newUrl.match(/(^https:\/\/www\.facebook\.com\/)(\S+)/g)) {
                errMessage = 'The URL must be in a format like ' +
                    'https://www.facebook.com/yourUsername';
                this.get('model.errors').add('facebook', errMessage);
                return;
            }

            // If new url didn't change, exit
            if (newUrl === oldUrl) {
                return;
            }

            // Validation complete
            this.set('model.facebook', newUrl);

            this.get('model').save().catch((errors) => {
                this.showErrors(errors);
                this.get('model').rollbackAttributes();
            });
        },

        validateTwitterUrl(userInput) {
            let newUrl = userInput.trim();
            let oldUrl = this.get('model.twitter');
            let errMessage = '';

            if (!newUrl) {
                // Clear out the Twitter url
                this.set('model.twitter', '');
                return;
            }

            if (!newUrl.match(/(^https:\/\/twitter\.com\/)(\S+)/g)) {
                errMessage = 'The URL must be in a format like ' +
                    'https://twitter.com/yourUsername';
                this.get('model.errors').add('twitter', errMessage);
                return;
            }

            // If new url didn't change, exit
            if (newUrl === oldUrl) {
                return;
            }

            this.set('model.twitter', newUrl);

            this.get('model').save().catch((errors) => {
                this.showErrors(errors);
                this.get('model').rollbackAttributes();
            });
        }
    }
});
