import Controller from 'ember-controller';
import Ember from 'ember';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import computed, {alias, and, not, or, readOnly} from 'ember-computed';
import injectService from 'ember-service/inject';
import isNumber from 'ghost-admin/utils/isNumber';
import run from 'ember-runloop';
import {htmlSafe} from 'ember-string';
import {isEmberArray} from 'ember-array/utils';
import {task, taskGroup} from 'ember-concurrency';

// ember-cli-shims doesn't export this
const {Handlebars} = Ember;

export default Controller.extend({
    showDeleteUserModal: false,
    showSuspendUserModal: false,
    showTransferOwnerModal: false,
    showUploadCoverModal: false,
    showUplaodImageModal: false,
    _scratchFacebook: null,
    _scratchTwitter: null,

    ajax: injectService(),
    config: injectService(),
    dropdown: injectService(),
    ghostPaths: injectService(),
    notifications: injectService(),
    session: injectService(),
    slugGenerator: injectService(),

    user: alias('model'),
    currentUser: alias('session.user'),

    email: readOnly('model.email'),
    slugValue: boundOneWay('model.slug'),

    isNotOwnersProfile: not('user.isOwner'),
    isAdminUserOnOwnerProfile: and('currentUser.isAdmin', 'user.isOwner'),
    canAssignRoles: or('currentUser.isAdmin', 'currentUser.isOwner'),
    canMakeOwner: and('currentUser.isOwner', 'isNotOwnProfile', 'user.isAdmin'),
    rolesDropdownIsVisible: and('isNotOwnProfile', 'canAssignRoles', 'isNotOwnersProfile'),
    userActionsAreVisible: or('deleteUserActionIsVisible', 'canMakeOwner'),

    isOwnProfile: computed('user.id', 'currentUser.id', function () {
        return this.get('user.id') === this.get('currentUser.id');
    }),
    isNotOwnProfile: not('isOwnProfile'),
    showMyGhostLink: and('config.ghostOAuth', 'isOwnProfile'),

    canChangeEmail: computed('config.ghostOAuth', 'isAdminUserOnOwnerProfile', function () {
        let ghostOAuth = this.get('config.ghostOAuth');
        let isAdminUserOnOwnerProfile = this.get('isAdminUserOnOwnerProfile');

        return !ghostOAuth && !isAdminUserOnOwnerProfile;
    }),

    deleteUserActionIsVisible: computed('currentUser', 'canAssignRoles', 'user', function () {
        if ((this.get('canAssignRoles') && this.get('isNotOwnProfile') && !this.get('user.isOwner'))
            || (this.get('currentUser.isEditor') && (this.get('isNotOwnProfile')
            || this.get('user.isAuthor')))) {
            return true;
        }
    }),

    canChangePassword: computed('config.ghostOAuth', 'isAdminUserOnOwnerProfile', function () {
        return !this.get('config.ghostOAuth') && !this.get('isAdminUserOnOwnerProfile');
    }),

    // duplicated in gh-user-active -- find a better home and consolidate?
    userDefault: computed('ghostPaths', function () {
        return `${this.get('ghostPaths.assetRoot')}/img/user-image.png`;
    }),

    userImageBackground: computed('user.profileImage', 'userDefault', function () {
        let url = this.get('user.profileImage') || this.get('userDefault');
        let safeUrl = Handlebars.Utils.escapeExpression(url);

        return htmlSafe(`background-image: url(${safeUrl})`);
    }),
    // end duplicated

    coverDefault: computed('ghostPaths', function () {
        return `${this.get('ghostPaths.assetRoot')}/img/user-cover.png`;
    }),

    coverImageBackground: computed('user.coverImage', 'coverDefault', function () {
        let url = this.get('user.coverImage') || this.get('coverDefault');
        let safeUrl = Handlebars.Utils.escapeExpression(url);

        return htmlSafe(`background-image: url(${safeUrl})`);
    }),

    coverTitle: computed('user.name', function () {
        return `${this.get('user.name')}'s Cover Image`;
    }),

    roles: computed(function () {
        return this.store.query('role', {permissions: 'assign'});
    }),

    _deleteUser() {
        if (this.get('deleteUserActionIsVisible')) {
            let user = this.get('user');
            return user.destroyRecord();
        }
    },

    _deleteUserSuccess() {
        this.get('notifications').closeAlerts('user.delete');
        this.store.unloadAll('post');
        this.transitionToRoute('team');
    },

    _deleteUserFailure() {
        this.get('notifications').showAlert('The user could not be deleted. Please try again.', {type: 'error', key: 'user.delete.failed'});
    },

    saveHandlers: taskGroup().enqueue(),

    updateSlug: task(function* (newSlug) {
        let slug = this.get('model.slug');

        newSlug = newSlug || slug;
        newSlug = newSlug.trim();

        // Ignore unchanged slugs or candidate slugs that are empty
        if (!newSlug || slug === newSlug) {
            this.set('slugValue', slug);

            return;
        }

        let serverSlug = yield this.get('slugGenerator').generateSlug('user', newSlug);

        // If after getting the sanitized and unique slug back from the API
        // we end up with a slug that matches the existing slug, abort the change
        if (serverSlug === slug) {
            return;
        }

        // Because the server transforms the candidate slug by stripping
        // certain characters and appending a number onto the end of slugs
        // to enforce uniqueness, there are cases where we can get back a
        // candidate slug that is a duplicate of the original except for
        // the trailing incrementor (e.g., this-is-a-slug and this-is-a-slug-2)

        // get the last token out of the slug candidate and see if it's a number
        let slugTokens = serverSlug.split('-');
        let check = Number(slugTokens.pop());

        // if the candidate slug is the same as the existing slug except
        // for the incrementor then the existing slug should be used
        if (isNumber(check) && check > 0) {
            if (slug === slugTokens.join('-') && serverSlug !== newSlug) {
                this.set('slugValue', slug);

                return;
            }
        }

        this.set('slugValue', serverSlug);
    }).group('saveHandlers'),

    save: task(function* () {
        let user = this.get('user');
        let slugValue = this.get('slugValue');
        let slugChanged;

        if (user.get('slug') !== slugValue) {
            slugChanged = true;
            user.set('slug', slugValue);
        }

        try {
            let model = yield user.save({format: false});
            let currentPath,
                newPath;

            // If the user's slug has changed, change the URL and replace
            // the history so refresh and back button still work
            if (slugChanged) {
                currentPath = window.location.hash;

                newPath = currentPath.split('/');
                newPath[newPath.length - 1] = model.get('slug');
                newPath = newPath.join('/');

                window.history.replaceState({path: newPath}, '', newPath);
            }

            this.get('notifications').closeAlerts('user.update');

            return model;
        } catch (error) {
            // validation engine returns undefined so we have to check
            // before treating the failure as an API error
            if (error) {
                this.get('notifications').showAPIError(error, {key: 'user.update'});
            }
        }
    }).group('saveHandlers'),

    actions: {
        changeRole(newRole) {
            this.set('model.role', newRole);
        },

        deleteUser() {
            return this._deleteUser().then(() => {
                this._deleteUserSuccess();
            }, () => {
                this._deleteUserFailure();
            });
        },

        toggleDeleteUserModal() {
            if (this.get('deleteUserActionIsVisible')) {
                this.toggleProperty('showDeleteUserModal');
            }
        },

        suspendUser() {
            this.get('model').set('status', 'inactive');
            return this.get('save').perform();
        },

        toggleSuspendUserModal() {
            if (this.get('deleteUserActionIsVisible')) {
                this.toggleProperty('showSuspendUserModal');
            }
        },

        unsuspendUser() {
            this.get('model').set('status', 'active');
            return this.get('save').perform();
        },

        toggleUnsuspendUserModal() {
            if (this.get('deleteUserActionIsVisible')) {
                this.toggleProperty('showUnsuspendUserModal');
            }
        },

        validateFacebookUrl() {
            let newUrl = this.get('_scratchFacebook');
            let oldUrl = this.get('user.facebook');
            let errMessage = '';

            if (newUrl === '') {
                // Clear out the Facebook url
                this.set('user.facebook', '');
                this.get('user.errors').remove('facebook');
                return;
            }

            // _scratchFacebook will be null unless the user has input something
            if (!newUrl) {
                newUrl = oldUrl;
            }

            // If new url didn't change, exit
            if (newUrl === oldUrl) {
                this.get('user.errors').remove('facebook');
                return;
            }

            // TODO: put the validation here into a validator
            if (newUrl.match(/(?:facebook\.com\/)(\S+)/) || newUrl.match(/([a-z\d\.]+)/i)) {
                let username = [];

                if (newUrl.match(/(?:facebook\.com\/)(\S+)/)) {
                    [, username] = newUrl.match(/(?:facebook\.com\/)(\S+)/);
                } else {
                    [, username] = newUrl.match(/(?:https\:\/\/|http\:\/\/)?(?:www\.)?(?:\w+\.\w+\/+)?(\S+)/mi);
                }

                // check if we have a /page/username or without
                if (username.match(/^(?:\/)?(pages?\/\S+)/mi)) {
                    // we got a page url, now save the username without the / in the beginning

                    [, username] = username.match(/^(?:\/)?(pages?\/\S+)/mi);
                } else if (username.match(/^(http|www)|(\/)/) || !username.match(/^([a-z\d\.]{1,50})$/mi)) {
                    errMessage = !username.match(/^([a-z\d\.]{1,50})$/mi) ? 'Your Username is not a valid Facebook Username' : 'The URL must be in a format like https://www.facebook.com/yourUsername';

                    this.get('user.errors').add('facebook', errMessage);
                    this.get('user.hasValidated').pushObject('facebook');
                    return;
                }

                newUrl = `https://www.facebook.com/${username}`;
                this.set('user.facebook', newUrl);

                this.get('user.errors').remove('facebook');
                this.get('user.hasValidated').pushObject('facebook');

                // User input is validated
                this.get('save').perform().then(() => {
                    // necessary to update the value in the input field
                    this.set('user.facebook', '');
                    run.schedule('afterRender', this, function () {
                        this.set('user.facebook', newUrl);
                    });
                });
            } else {
                errMessage = 'The URL must be in a format like '
                           + 'https://www.facebook.com/yourUsername';
                this.get('user.errors').add('facebook', errMessage);
                this.get('user.hasValidated').pushObject('facebook');
                return;
            }
        },

        validateTwitterUrl() {
            let newUrl = this.get('_scratchTwitter');
            let oldUrl = this.get('user.twitter');
            let errMessage = '';

            if (newUrl === '') {
                // Clear out the Twitter url
                this.set('user.twitter', '');
                this.get('user.errors').remove('twitter');
                return;
            }

            // _scratchTwitter will be null unless the user has input something
            if (!newUrl) {
                newUrl = oldUrl;
            }

            // If new url didn't change, exit
            if (newUrl === oldUrl) {
                this.get('user.errors').remove('twitter');
                return;
            }

            // TODO: put the validation here into a validator
            if (newUrl.match(/(?:twitter\.com\/)(\S+)/) || newUrl.match(/([a-z\d\.]+)/i)) {
                let username = [];

                if (newUrl.match(/(?:twitter\.com\/)(\S+)/)) {
                    [, username] = newUrl.match(/(?:twitter\.com\/)(\S+)/);
                } else {
                    [username] = newUrl.match(/([^/]+)\/?$/mi);
                }

                // check if username starts with http or www and show error if so
                if (username.match(/^(http|www)|(\/)/) || !username.match(/^[a-z\d\.\_]{1,15}$/mi)) {
                    errMessage = !username.match(/^[a-z\d\.\_]{1,15}$/mi) ? 'Your Username is not a valid Twitter Username' : 'The URL must be in a format like https://twitter.com/yourUsername';

                    this.get('user.errors').add('twitter', errMessage);
                    this.get('user.hasValidated').pushObject('twitter');
                    return;
                }

                newUrl = `https://twitter.com/${username}`;
                this.set('user.twitter', newUrl);

                this.get('user.errors').remove('twitter');
                this.get('user.hasValidated').pushObject('twitter');

                // User input is validated
                this.get('save').perform().then(() => {
                    // necessary to update the value in the input field
                    this.set('user.twitter', '');
                    run.schedule('afterRender', this, function () {
                        this.set('user.twitter', newUrl);
                    });
                });
            } else {
                errMessage = 'The URL must be in a format like '
                           + 'https://twitter.com/yourUsername';
                this.get('user.errors').add('twitter', errMessage);
                this.get('user.hasValidated').pushObject('twitter');
                return;
            }
        },

        transferOwnership() {
            let user = this.get('user');
            let url = this.get('ghostPaths.url').api('users', 'owner');

            this.get('dropdown').closeDropdowns();

            return this.get('ajax').put(url, {
                data: {
                    owner: [{
                        id: user.get('id')
                    }]
                }
            }).then((response) => {
                // manually update the roles for the users that just changed roles
                // because store.pushPayload is not working with embedded relations
                if (response && isEmberArray(response.users)) {
                    response.users.forEach((userJSON) => {
                        let user = this.store.peekRecord('user', userJSON.id);
                        let role = this.store.peekRecord('role', userJSON.roles[0].id);

                        user.set('role', role);
                    });
                }

                this.get('notifications').showAlert(`Ownership successfully transferred to ${user.get('name')}`, {type: 'success', key: 'owner.transfer.success'});
            }).catch((error) => {
                this.get('notifications').showAPIError(error, {key: 'owner.transfer'});
            });
        },

        toggleTransferOwnerModal() {
            if (this.get('canMakeOwner')) {
                this.toggleProperty('showTransferOwnerModal');
            }
        },

        toggleUploadCoverModal() {
            this.toggleProperty('showUploadCoverModal');
        },

        toggleUploadImageModal() {
            this.toggleProperty('showUploadImageModal');
        },

        // TODO: remove those mutation actions once we have better
        // inline validations that auto-clear errors on input
        updatePassword(password) {
            this.set('user.password', password);
            this.get('user.hasValidated').removeObject('password');
            this.get('user.errors').remove('password');
        },

        updateNewPassword(password) {
            this.set('user.newPassword', password);
            this.get('user.hasValidated').removeObject('newPassword');
            this.get('user.errors').remove('newPassword');
        },

        updateNe2Password(password) {
            this.set('user.ne2Password', password);
            this.get('user.hasValidated').removeObject('ne2Password');
            this.get('user.errors').remove('ne2Password');
        }
    }
});
