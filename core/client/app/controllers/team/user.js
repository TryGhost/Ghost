import Ember from 'ember';
import isNumber from 'ghost/utils/isNumber';
import boundOneWay from 'ghost/utils/bound-one-way';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {
    Controller,
    RSVP,
    computed,
    inject: {service},
    isArray
} = Ember;
const {alias, and, not, or, readOnly} = computed;

export default Controller.extend(ValidationEngine, {
    // ValidationEngine settings
    validationType: 'user',
    submitting: false,
    lastPromise: null,
    showDeleteUserModal: false,
    showTransferOwnerModal: false,
    showUploadCoverModal: false,
    showUplaodImageModal: false,

    ajax: service(),
    dropdown: service(),
    ghostPaths: service(),
    notifications: service(),
    session: service(),
    slugGenerator: service(),

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

    isNotOwnProfile: computed('user.id', 'currentUser.id', function () {
        return this.get('user.id') !== this.get('currentUser.id');
    }),

    deleteUserActionIsVisible: computed('currentUser', 'canAssignRoles', 'user', function () {
        if ((this.get('canAssignRoles') && this.get('isNotOwnProfile') && !this.get('user.isOwner')) ||
            (this.get('currentUser.isEditor') && (this.get('isNotOwnProfile') ||
            this.get('user.isAuthor')))) {
            return true;
        }
    }),

    // duplicated in gh-user-active -- find a better home and consolidate?
    userDefault: computed('ghostPaths', function () {
        return `${this.get('ghostPaths.subdir')}/ghost/img/user-image.png`;
    }),

    userImageBackground: computed('user.image', 'userDefault', function () {
        let url = this.get('user.image') || this.get('userDefault');

        return Ember.String.htmlSafe(`background-image: url(${url})`);
    }),
    // end duplicated

    coverDefault: computed('ghostPaths', function () {
        return `${this.get('ghostPaths.subdir')}/ghost/img/user-cover.png`;
    }),

    coverImageBackground: computed('user.cover', 'coverDefault', function () {
        let url = this.get('user.cover') || this.get('coverDefault');

        return Ember.String.htmlSafe(`background-image: url(${url})`);
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

    actions: {
        changeRole(newRole) {
            this.set('model.role', newRole);
        },

        save() {
            let user = this.get('user');
            let slugValue = this.get('slugValue');
            let afterUpdateSlug = this.get('lastPromise');
            let promise,
                slugChanged;

            if (user.get('slug') !== slugValue) {
                slugChanged = true;
                user.set('slug', slugValue);
            }

            this.toggleProperty('submitting');

            promise = RSVP.resolve(afterUpdateSlug).then(() => {
                return user.save({format: false});
            }).then((model) => {
                let currentPath,
                    newPath;

                // If the user's slug has changed, change the URL and replace
                // the history so refresh and back button still work
                if (slugChanged) {
                    currentPath = window.history.state.path;

                    newPath = currentPath.split('/');
                    newPath[newPath.length - 2] = model.get('slug');
                    newPath = newPath.join('/');

                    window.history.replaceState({path: newPath}, '', newPath);
                }

                this.toggleProperty('submitting');
                this.get('notifications').closeAlerts('user.update');

                return model;
            }).catch((errors) => {
                if (errors) {
                    this.get('notifications').showErrors(errors, {key: 'user.update'});
                }

                this.toggleProperty('submitting');
            });

            this.set('lastPromise', promise);
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

        password() {
            let user = this.get('user');

            if (user.get('isPasswordValid')) {
                user.saveNewPassword().then((model) => {
                    // Clear properties from view
                    user.setProperties({
                        password: '',
                        newPassword: '',
                        ne2Password: ''
                    });

                    this.get('notifications').showAlert('Password updated.', {type: 'success', key: 'user.change-password.success'});

                    return model;
                }).catch((errors) => {
                    this.get('notifications').showAPIError(errors, {key: 'user.change-password'});
                });
            } else {
                // TODO: switch to in-line validation
                this.get('notifications').showErrors(user.get('passwordValidationErrors'), {key: 'user.change-password'});
            }
        },

        updateSlug(newSlug) {
            let afterSave = this.get('lastPromise');
            let promise;

            promise = RSVP.resolve(afterSave).then(() => {
                let slug = this.get('model.slug');

                newSlug = newSlug || slug;
                newSlug = newSlug.trim();

                // Ignore unchanged slugs or candidate slugs that are empty
                if (!newSlug || slug === newSlug) {
                    this.set('slugValue', slug);

                    return;
                }

                return this.get('slugGenerator').generateSlug('user', newSlug).then((serverSlug) => {
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
                });
            });

            this.set('lastPromise', promise);
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
                if (response && isArray(response.users)) {
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
        }
    }
});
