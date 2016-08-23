import Controller from 'ember-controller';
import computed, {notEmpty} from 'ember-computed';
import injectService from 'ember-service/inject';
import observer from 'ember-metal/observer';
import run from 'ember-runloop';
import SettingsSaveMixin from 'ghost-admin/mixins/settings-save';
import randomPassword from 'ghost-admin/utils/random-password';
import $ from 'jquery';

export default Controller.extend(SettingsSaveMixin, {

    availableTimezones: null,
    themeToDelete: null,

    showUploadLogoModal: false,
    showUploadCoverModal: false,
    showDeleteThemeModal: notEmpty('themeToDelete'),

    ajax: injectService(),
    config: injectService(),
    ghostPaths: injectService(),
    notifications: injectService(),
    session: injectService(),
    _scratchFacebook: null,
    _scratchTwitter: null,

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

    generatePassword: observer('model.isPrivate', function () {
        this.get('model.errors').remove('password');
        if (this.get('model.isPrivate') && this.get('model.hasDirtyAttributes')) {
            this.get('model').set('password', randomPassword());
        }
    }),

    _deleteTheme() {
        let theme = this.get('themeToDelete');
        let themeURL = `${this.get('ghostPaths.apiRoot')}/themes/${theme.name}/`;

        if (!theme) {
            return;
        }

        return this.get('ajax').del(themeURL).then(() => {
            this.send('reloadSettings');
        }).catch((error) => {
            this.get('notifications').showAPIError(error);
        });
    },

    save() {
        let notifications = this.get('notifications');
        let config = this.get('config');
        return this.get('model').save().then((model) => {
            config.set('blogTitle', model.get('title'));

            // this forces the document title to recompute after
            // a blog title change
            this.send('collectTitleTokens', []);

            return model;
        }).catch((error) => {
            if (error) {
                notifications.showAPIError(error, {key: 'settings.save'});
            }
            throw error;
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
            this.send('save');
        },

        downloadTheme(theme) {
            let themeURL = `${this.get('ghostPaths.apiRoot')}/themes/${theme.name}`;
            let accessToken = this.get('session.data.authenticated.access_token');
            let downloadURL = `${themeURL}/download/?access_token=${accessToken}`;
            let iframe = $('#iframeDownload');

            if (iframe.length === 0) {
                iframe = $('<iframe>', {id: 'iframeDownload'}).hide().appendTo('body');
            }

            iframe.attr('src', downloadURL);
        },

        deleteTheme(theme) {
            if (theme) {
                return this.set('themeToDelete', theme);
            }

            return this._deleteTheme();
        },

        hideDeleteThemeModal() {
            this.set('themeToDelete', null);
        },

        setTimezone(timezone) {
            this.set('model.activeTimezone', timezone.name);
        },

        toggleUploadCoverModal() {
            this.toggleProperty('showUploadCoverModal');
        },

        toggleUploadLogoModal() {
            this.toggleProperty('showUploadLogoModal');
        },

        validateFacebookUrl() {
            let newUrl = this.get('_scratchFacebook');
            let oldUrl = this.get('model.facebook');
            let errMessage = '';

            if (newUrl === '') {
                // Clear out the Facebook url
                this.set('model.facebook', '');
                this.get('model.errors').remove('facebook');
                return;
            }

            // _scratchFacebook will be null unless the user has input something
            if (!newUrl) {
                newUrl = oldUrl;
            }

            // If new url didn't change, exit
            if (newUrl === oldUrl) {
                this.get('model.errors').remove('facebook');
                return;
            }

            if (newUrl.match(/(?:facebook\.com\/)(\S+)/) || newUrl.match(/([a-z\d\.]+)/i)) {
                let username = [];

                if (newUrl.match(/(?:facebook\.com\/)(\S+)/)) {
                    [ , username ] = newUrl.match(/(?:facebook\.com\/)(\S+)/);
                } else {
                    [ , username ] = newUrl.match(/(?:https\:\/\/|http\:\/\/)?(?:www\.)?(?:\w+\.\w+\/+)?(\S+)/mi);
                }

                // check if we have a /page/username or without
                if (username.match(/^(?:\/)?(pages?\/\S+)/mi)) {
                    // we got a page url, now save the username without the / in the beginning

                    [ , username ] = username.match(/^(?:\/)?(pages?\/\S+)/mi);
                } else if (username.match(/^(http|www)|(\/)/) || !username.match(/^([a-z\d\.]{5,50})$/mi)) {
                    errMessage = !username.match(/^([a-z\d\.]{5,50})$/mi) ? 'Your Page name is not a valid Facebook Page name' : 'The URL must be in a format like https://www.facebook.com/yourPage';

                    this.get('model.errors').add('facebook', errMessage);
                    this.get('model.hasValidated').pushObject('facebook');
                    return;
                }

                newUrl = `https://www.facebook.com/${username}`;
                this.set('model.facebook', newUrl);

                this.get('model.errors').remove('facebook');
                this.get('model.hasValidated').pushObject('facebook');

                // User input is validated
                return this.save().then(() => {
                    this.set('model.facebook', '');
                    run.schedule('afterRender', this, function () {
                        this.set('model.facebook', newUrl);
                    });
                });
            } else {
                errMessage = 'The URL must be in a format like ' +
                    'https://www.facebook.com/yourPage';
                this.get('model.errors').add('facebook', errMessage);
                this.get('model.hasValidated').pushObject('facebook');
                return;
            }
        },

        validateTwitterUrl() {
            let newUrl = this.get('_scratchTwitter');
            let oldUrl = this.get('model.twitter');
            let errMessage = '';

            if (newUrl === '') {
                // Clear out the Twitter url
                this.set('model.twitter', '');
                this.get('model.errors').remove('twitter');
                return;
            }

            // _scratchTwitter will be null unless the user has input something
            if (!newUrl) {
                newUrl = oldUrl;
            }

            // If new url didn't change, exit
            if (newUrl === oldUrl) {
                this.get('model.errors').remove('twitter');
                return;
            }

            if (newUrl.match(/(?:twitter\.com\/)(\S+)/) || newUrl.match(/([a-z\d\.]+)/i)) {
                let username = [];

                if (newUrl.match(/(?:twitter\.com\/)(\S+)/)) {
                    [ , username] = newUrl.match(/(?:twitter\.com\/)(\S+)/);
                } else {
                    [username] = newUrl.match(/([^/]+)\/?$/mi);
                }

                // check if username starts with http or www and show error if so
                if (username.match(/^(http|www)|(\/)/) || !username.match(/^[a-z\d\.\_]{1,15}$/mi)) {
                    errMessage = !username.match(/^[a-z\d\.\_]{1,15}$/mi) ? 'Your Username is not a valid Twitter Username' : 'The URL must be in a format like https://twitter.com/yourUsername';

                    this.get('model.errors').add('twitter', errMessage);
                    this.get('model.hasValidated').pushObject('twitter');
                    return;
                }

                newUrl = `https://twitter.com/${username}`;
                this.set('model.twitter', newUrl);

                this.get('model.errors').remove('twitter');
                this.get('model.hasValidated').pushObject('twitter');

                // User input is validated
                return this.save().then(() => {
                    this.set('model.twitter', '');
                    run.schedule('afterRender', this, function () {
                        this.set('model.twitter', newUrl);
                    });
                });
            } else {
                errMessage = 'The URL must be in a format like ' +
                    'https://twitter.com/yourUsername';
                this.get('model.errors').add('twitter', errMessage);
                this.get('model.hasValidated').pushObject('twitter');
                return;
            }
        }
    }
});
