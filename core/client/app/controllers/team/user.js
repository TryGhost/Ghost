import Ember from 'ember';
import SlugGenerator from 'ghost/models/slug-generator';
import isNumber from 'ghost/utils/isNumber';
import boundOneWay from 'ghost/utils/bound-one-way';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {Controller, RSVP, computed, inject} = Ember;
const {alias, and, not, or, readOnly} = computed;

export default Controller.extend(ValidationEngine, {
    // ValidationEngine settings
    validationType: 'user',
    submitting: false,

    ghostPaths: inject.service('ghost-paths'),
    notifications: inject.service(),
    session: inject.service(),

    lastPromise: null,

    currentUser: alias('session.user'),
    user: alias('model'),
    email: readOnly('user.email'),
    slugValue: boundOneWay('user.slug'),

    isNotOwnProfile: computed('user.id', 'currentUser.id', function () {
        return this.get('user.id') !== this.get('currentUser.id');
    }),

    isNotOwnersProfile: not('user.isOwner'),

    isAdminUserOnOwnerProfile: and('currentUser.isAdmin', 'user.isOwner'),

    canAssignRoles: or('currentUser.isAdmin', 'currentUser.isOwner'),

    canMakeOwner: and('currentUser.isOwner', 'isNotOwnProfile', 'user.isAdmin'),

    rolesDropdownIsVisible: and('isNotOwnProfile', 'canAssignRoles', 'isNotOwnersProfile'),

    deleteUserActionIsVisible: computed('currentUser', 'canAssignRoles', 'user', function () {
        if ((this.get('canAssignRoles') && this.get('isNotOwnProfile') && !this.get('user.isOwner')) ||
            (this.get('currentUser.isEditor') && (this.get('isNotOwnProfile') ||
            this.get('user.isAuthor')))) {
            return true;
        }
    }),

    userActionsAreVisible: or('deleteUserActionIsVisible', 'canMakeOwner'),

    // duplicated in gh-user-active -- find a better home and consolidate?
    userDefault: computed('ghostPaths', function () {
        return this.get('ghostPaths.url').asset('/shared/img/user-image.png');
    }),

    userImageBackground: computed('user.image', 'userDefault', function () {
        let url = this.get('user.image') || this.get('userDefault');

        return Ember.String.htmlSafe(`background-image: url(${url})`);
    }),
    // end duplicated

    coverDefault: computed('ghostPaths', function () {
        return this.get('ghostPaths.url').asset('/shared/img/user-cover.png');
    }),

    coverImageBackground: computed('user.cover', 'coverDefault', function () {
        let url = this.get('user.cover') || this.get('coverDefault');

        return Ember.String.htmlSafe(`background-image: url(${url})`);
    }),

    coverTitle: computed('user.name', function () {
        return `${this.get('user.name')}'s Cover Image`;
    }),

    // Lazy load the slug generator for slugPlaceholder
    slugGenerator: computed(function () {
        return SlugGenerator.create({
            ghostPaths: this.get('ghostPaths'),
            slugType: 'user'
        });
    }),

    roles: computed(function () {
        return this.store.query('role', {permissions: 'assign'});
    }),

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

                return this.get('slugGenerator').generateSlug(newSlug).then((serverSlug) => {
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
        }
    }
});
