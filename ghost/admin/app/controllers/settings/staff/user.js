import Controller from '@ember/controller';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import isNumber from 'ghost-admin/utils/isNumber';
import validator from 'validator';
import windowProxy from 'ghost-admin/utils/window-proxy';
import {alias, and, not, or, readOnly} from '@ember/object/computed';
import {computed} from '@ember/object';
import {isArray as isEmberArray} from '@ember/array';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {task, taskGroup, timeout} from 'ember-concurrency';

export default Controller.extend({
    ajax: service(),
    config: service(),
    dropdown: service(),
    ghostPaths: service(),
    limit: service(),
    notifications: service(),
    session: service(),
    slugGenerator: service(),
    utils: service(),

    personalToken: null,
    limitErrorMessage: null,
    personalTokenRegenerated: false,
    leaveSettingsTransition: null,
    dirtyAttributes: false,
    showDeleteUserModal: false,
    showSuspendUserModal: false,
    showTransferOwnerModal: false,
    showUploadCoverModal: false,
    showUploadImageModal: false,
    showRegenerateTokenModal: false,
    showRoleSelectionModal: false,
    _scratchFacebook: null,
    _scratchTwitter: null,

    saveHandlers: taskGroup().enqueue(),

    user: alias('model'),
    currentUser: alias('session.user'),

    email: readOnly('user.email'),
    slugValue: boundOneWay('user.slug'),

    canChangeEmail: not('isAdminUserOnOwnerProfile'),
    canChangePassword: not('isAdminUserOnOwnerProfile'),
    canMakeOwner: and('currentUser.isOwnerOnly', 'isNotOwnProfile', 'user.isAdminOnly', 'isNotSuspended'),
    isAdminUserOnOwnerProfile: and('currentUser.isAdminOnly', 'user.isOwnerOnly'),
    isNotOwnersProfile: not('user.isOwnerOnly'),
    isNotSuspended: not('user.isSuspended'),
    rolesDropdownIsVisible: and('currentUser.isAdmin', 'isNotOwnProfile', 'isNotOwnersProfile'),
    userActionsAreVisible: or('deleteUserActionIsVisible', 'canMakeOwner'),

    isNotOwnProfile: not('isOwnProfile'),
    isOwnProfile: computed('user.id', 'currentUser.id', function () {
        return this.get('user.id') === this.get('currentUser.id');
    }),

    deleteUserActionIsVisible: computed('currentUser.{isAdmin,isEditor}', 'user.{isOwnerOnly,isAuthorOrContributor}', 'isOwnProfile', function () {
        // users can't delete themselves
        if (this.isOwnProfile) {
            return false;
        }

        if (
            // owners/admins can delete any non-owner user
            (this.currentUser.get('isAdmin') && !this.user.isOwnerOnly) ||
            // editors can delete any author or contributor
            (this.currentUser.get('isEditor') && this.user.isAuthorOrContributor)
        ) {
            return true;
        }

        return false;
    }),

    coverTitle: computed('user.name', function () {
        return `${this.get('user.name')}'s Cover Image`;
    }),

    roles: computed(function () {
        return this.store.query('role', {permissions: 'assign'});
    }),

    actions: {
        toggleRoleSelectionModal(event) {
            event?.preventDefault?.();
            this.toggleProperty('showRoleSelectionModal');
        },

        changeRole(newRole) {
            this.user.set('role', newRole);
            this.set('dirtyAttributes', true);
        },

        toggleDeleteUserModal() {
            if (this.deleteUserActionIsVisible) {
                this.toggleProperty('showDeleteUserModal');
            }
        },

        suspendUser() {
            this.user.set('status', 'inactive');
            return this.save.perform();
        },

        toggleSuspendUserModal() {
            if (this.deleteUserActionIsVisible) {
                this.toggleProperty('showSuspendUserModal');
            }
        },

        unsuspendUser() {
            this.user.set('status', 'active');
            return this.save.perform();
        },

        toggleUnsuspendUserModal() {
            if (this.deleteUserActionIsVisible) {
                if (this.user.role.name !== 'Contributor'
                    && this.limit.limiter
                    && this.limit.limiter.isLimited('staff')
                ) {
                    this.limit.limiter.errorIfWouldGoOverLimit('staff')
                        .then(() => {
                            this.toggleProperty('showUnsuspendUserModal');
                        })
                        .catch((error) => {
                            if (error.errorType === 'HostLimitError') {
                                this.limitErrorMessage = error.message;
                                this.toggleProperty('showUnsuspendUserModal');
                            } else {
                                this.notifications.showAPIError(error, {key: 'staff.limit'});
                            }
                        });
                } else {
                    this.toggleProperty('showUnsuspendUserModal');
                }
            }
        },

        validateFacebookUrl() {
            let newUrl = this._scratchFacebook;
            let oldUrl = this.get('user.facebook');
            let errMessage = '';

            // reset errors and validation
            this.get('user.errors').remove('facebook');
            this.get('user.hasValidated').removeObject('facebook');

            if (newUrl === '') {
                // Clear out the Facebook url
                this.set('user.facebook', '');
                return;
            }

            // _scratchFacebook will be null unless the user has input something
            if (!newUrl) {
                newUrl = oldUrl;
            }

            try {
                // strip any facebook URLs out
                newUrl = newUrl.replace(/(https?:\/\/)?(www\.)?facebook\.com/i, '');

                // don't allow any non-facebook urls
                if (newUrl.match(/^(http|\/\/)/i)) {
                    throw 'invalid url';
                }

                // strip leading / if we have one then concat to full facebook URL
                newUrl = newUrl.replace(/^\//, '');
                newUrl = `https://www.facebook.com/${newUrl}`;

                // don't allow URL if it's not valid
                if (!validator.isURL(newUrl)) {
                    throw 'invalid url';
                }

                this.set('user.facebook', '');
                run.schedule('afterRender', this, function () {
                    this.set('user.facebook', newUrl);
                });
            } catch (e) {
                if (e === 'invalid url') {
                    errMessage = 'The URL must be in a format like '
                               + 'https://www.facebook.com/yourPage';
                    this.get('user.errors').add('facebook', errMessage);
                    return;
                }

                throw e;
            } finally {
                this.get('user.hasValidated').pushObject('facebook');
            }
        },

        validateTwitterUrl() {
            let newUrl = this._scratchTwitter;
            let oldUrl = this.get('user.twitter');
            let errMessage = '';

            // reset errors and validation
            this.get('user.errors').remove('twitter');
            this.get('user.hasValidated').removeObject('twitter');

            if (newUrl === '') {
                // Clear out the Twitter url
                this.set('user.twitter', '');
                return;
            }

            // _scratchTwitter will be null unless the user has input something
            if (!newUrl) {
                newUrl = oldUrl;
            }

            if (newUrl.match(/(?:twitter\.com\/)(\S+)/) || newUrl.match(/([a-z\d.]+)/i)) {
                let username = [];

                if (newUrl.match(/(?:twitter\.com\/)(\S+)/)) {
                    [, username] = newUrl.match(/(?:twitter\.com\/)(\S+)/);
                } else {
                    [username] = newUrl.match(/([^/]+)\/?$/mi);
                }

                // check if username starts with http or www and show error if so
                if (username.match(/^(http|www)|(\/)/) || !username.match(/^[a-z\d._]{1,15}$/mi)) {
                    errMessage = !username.match(/^[a-z\d._]{1,15}$/mi) ? 'Your Username is not a valid Twitter Username' : 'The URL must be in a format like https://twitter.com/yourUsername';

                    this.get('user.errors').add('twitter', errMessage);
                    this.get('user.hasValidated').pushObject('twitter');
                    return;
                }

                newUrl = `https://twitter.com/${username}`;

                this.get('user.hasValidated').pushObject('twitter');

                this.set('user.twitter', '');
                run.schedule('afterRender', this, function () {
                    this.set('user.twitter', newUrl);
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
            let user = this.user;
            let url = this.get('ghostPaths.url').api('users', 'owner');

            this.dropdown.closeDropdowns();

            return this.ajax.put(url, {
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
                        let updatedUser = this.store.peekRecord('user', userJSON.id);
                        let role = this.store.peekRecord('role', userJSON.roles[0].id);

                        updatedUser.set('role', role);
                    });
                }

                this.notifications.showAlert(`Ownership successfully transferred to ${user.get('name')}`, {type: 'success', key: 'owner.transfer.success'});
            }).catch((error) => {
                this.notifications.showAPIError(error, {key: 'owner.transfer'});
            });
        },

        toggleLeaveSettingsModal(transition) {
            let leaveTransition = this.leaveSettingsTransition;

            if (!transition && this.showLeaveSettingsModal) {
                this.set('leaveSettingsTransition', null);
                this.set('showLeaveSettingsModal', false);
                return;
            }

            if (!leaveTransition || transition.targetName === leaveTransition.targetName) {
                this.set('leaveSettingsTransition', transition);

                // if a save is running, wait for it to finish then transition
                if (this.get('saveHandlers.isRunning')) {
                    return this.get('saveHandlers.last').then(() => {
                        transition.retry();
                    });
                }

                // we genuinely have unsaved data, show the modal
                this.set('showLeaveSettingsModal', true);
            }
        },

        leaveSettings() {
            let transition = this.leaveSettingsTransition;
            let user = this.user;

            if (!transition) {
                this.notifications.showAlert('Sorry, there was an error in the application. Please let the Ghost team know what happened.', {type: 'error'});
                return;
            }

            // roll back changes on user props
            user.rollbackAttributes();
            // roll back the slugValue property
            if (this.dirtyAttributes) {
                this.set('slugValue', user.get('slug'));
                this.set('dirtyAttributes', false);
            }

            return transition.retry();
        },

        toggleTransferOwnerModal() {
            if (this.canMakeOwner) {
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
        },

        confirmRegenerateTokenModal() {
            this.set('showRegenerateTokenModal', true);
        },

        cancelRegenerateTokenModal() {
            this.set('showRegenerateTokenModal', false);
        },

        regenerateToken() {
            let url = this.get('ghostPaths.url').api('users', 'me', 'token');

            return this.ajax.put(url, {data: {}}).then(({apiKey}) => {
                this.set('personalToken', apiKey.id + ':' + apiKey.secret);
                this.set('personalTokenRegenerated', true);
            }).catch((error) => {
                this.notifications.showAPIError(error, {key: 'token.regenerate'});
            });
        }
    },

    _exportDb(filename) {
        this.utils.downloadFile(`${this.ghostPaths.url.api('db')}?filename=${filename}`);
    },

    deleteUser: task(function *() {
        try {
            const result = yield this.user.destroyRecord();

            if (result._meta && result._meta.filename) {
                this._exportDb(result._meta.filename);
                // give the iframe some time to trigger the download before
                // it's removed from the dom when transitioning
                yield timeout(300);
            }

            this.notifications.closeAlerts('user.delete');
            this.store.unloadAll('post');
            this.transitionToRoute('settings.staff');
        } catch (error) {
            this.notifications.showAlert('The user could not be deleted. Please try again.', {type: 'error', key: 'user.delete.failed'});
            throw error;
        }
    }),

    updateSlug: task(function* (newSlug) {
        let slug = this.get('user.slug');

        newSlug = newSlug || slug;
        newSlug = newSlug.trim();

        // Ignore unchanged slugs or candidate slugs that are empty
        if (!newSlug || slug === newSlug) {
            this.set('slugValue', slug);

            return true;
        }

        let serverSlug = yield this.slugGenerator.generateSlug('user', newSlug);

        // If after getting the sanitized and unique slug back from the API
        // we end up with a slug that matches the existing slug, abort the change
        if (serverSlug === slug) {
            return true;
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

                return true;
            }
        }

        this.set('slugValue', serverSlug);
        this.set('dirtyAttributes', true);

        return true;
    }).group('saveHandlers'),

    save: task(function* () {
        let user = this.user;
        let slugValue = this.slugValue;
        let slugChanged;

        if (user.get('slug') !== slugValue) {
            slugChanged = true;
            user.set('slug', slugValue);
        }

        try {
            user = yield user.save({format: false});

            // If the user's slug has changed, change the URL and replace
            // the history so refresh and back button still work
            if (slugChanged) {
                let currentPath = window.location.hash;

                let newPath = currentPath.split('/');
                newPath[newPath.length - 1] = user.get('slug');
                newPath = newPath.join('/');

                windowProxy.replaceState({path: newPath}, '', newPath);
            }

            this.set('dirtyAttributes', false);
            this.notifications.closeAlerts('user.update');

            return user;
        } catch (error) {
            // validation engine returns undefined so we have to check
            // before treating the failure as an API error
            if (error) {
                this.notifications.showAPIError(error, {key: 'user.update'});
            }
        }
    }).group('saveHandlers'),

    copyContentKey: task(function* () {
        copyTextToClipboard(this.personalToken);
        yield timeout(this.isTesting ? 50 : 3000);
    })
});
