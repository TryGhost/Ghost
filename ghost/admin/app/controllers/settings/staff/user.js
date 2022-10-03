import Controller from '@ember/controller';
import DeleteUserModal from '../../../components/settings/staff/modals/delete-user';
import RegenerateStaffTokenModal from '../../../components/settings/staff/modals/regenerate-staff-token';
import SelectRoleModal from '../../../components/settings/staff/modals/select-role';
import SuspendUserModal from '../../../components/settings/staff/modals/suspend-user';
import TransferOwnershipModal from '../../../components/settings/staff/modals/transfer-ownership';
import UnsuspendUserModal from '../../../components/settings/staff/modals/unsuspend-user';
import UploadImageModal from '../../../components/settings/staff/modals/upload-image';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import isNumber from 'ghost-admin/utils/isNumber';
import validator from 'validator';
import windowProxy from 'ghost-admin/utils/window-proxy';
import {action, computed} from '@ember/object';
import {alias, and, not, or, readOnly} from '@ember/object/computed';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {task, taskGroup, timeout} from 'ember-concurrency';

export default Controller.extend({
    ajax: service(),
    config: service(),
    ghostPaths: service(),
    membersUtils: service(),
    modals: service(),
    notifications: service(),
    session: service(),
    slugGenerator: service(),
    utils: service(),

    personalToken: null,
    personalTokenRegenerated: false,
    dirtyAttributes: false,
    _scratchFacebook: null,
    _scratchTwitter: null,

    saveHandlers: taskGroup().enqueue(),

    user: alias('model'),
    currentUser: alias('session.user'),

    email: readOnly('user.email'),
    slugValue: boundOneWay('user.slug'),

    canChangeEmail: not('isAdminUserOnOwnerProfile'),
    canChangePassword: not('isAdminUserOnOwnerProfile'),
    canToggleMemberAlerts: or('currentUser.isOwnerOnly', 'isAdminUserOnOwnProfile'),
    isAdminUserOnOwnProfile: and('currentUser.isAdminOnly', 'isOwnProfile'),
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
    },

    deleteUser: action(async function () {
        if (this.deleteUserActionIsVisible) {
            await this.modals.open(DeleteUserModal, {
                user: this.model
            });
        }
    }),

    suspendUser: action(async function () {
        if (this.deleteUserActionIsVisible) {
            await this.modals.open(SuspendUserModal, {
                user: this.model,
                saveTask: this.save
            });
        }
    }),

    unsuspendUser: action(async function () {
        if (this.deleteUserActionIsVisible) {
            await this.modals.open(UnsuspendUserModal, {
                user: this.model,
                saveTask: this.save
            });
        }
    }),

    transferOwnership: action(async function () {
        if (this.canMakeOwner) {
            await this.modals.open(TransferOwnershipModal, {
                user: this.model
            });
        }
    }),

    regenerateStaffToken: action(async function () {
        const apiToken = await this.modals.open(RegenerateStaffTokenModal);

        if (apiToken) {
            this.set('personalToken', apiToken);
            this.set('personalTokenRegenerated', true);
        }
    }),

    selectRole: action(async function () {
        const newRole = await this.modals.open(SelectRoleModal, {
            currentRole: this.model.role
        });

        if (newRole) {
            this.user.role = newRole;
            this.set('dirtyAttributes', true);
        }
    }),

    changeCoverImage: action(async function () {
        await this.modals.open(UploadImageModal, {
            model: this.model,
            modelProperty: 'coverImage'
        });
    }),

    changeProfileImage: action(async function () {
        await this.modals.open(UploadImageModal, {
            model: this.model,
            modelProperty: 'profileImage'
        });
    }),

    reset: action(function () {
        this.user.rollbackAttributes();
        this.user.password = '';
        this.user.newPassword = '';
        this.user.ne2Password = '';
        this.set('slugValue', this.user.slug);
        this.set('dirtyAttributes', false);
    }),

    toggleCommentNotifications: action(function (event) {
        this.user.commentNotifications = event.target.checked;
    }),

    toggleMemberEmailAlerts: action(function (type, event) {
        if (type === 'free-signup') {
            this.user.freeMemberSignupNotification = event.target.checked;
        } else if (type === 'paid-started') {
            this.user.paidSubscriptionStartedNotification = event.target.checked;
        } else if (type === 'paid-canceled') {
            this.user.paidSubscriptionCanceledNotification = event.target.checked;
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
