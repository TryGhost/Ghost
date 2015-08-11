import Ember from 'ember';
import SlugGenerator from 'ghost/models/slug-generator';
import isNumber from 'ghost/utils/isNumber';
import boundOneWay from 'ghost/utils/bound-one-way';
import ValidationEngine from 'ghost/mixins/validation-engine';

export default Ember.Controller.extend(ValidationEngine, {
    // ValidationEngine settings
    validationType: 'user',
    submitting: false,

    ghostPaths: Ember.inject.service('ghost-paths'),
    notifications: Ember.inject.service(),

    currentUser: Ember.computed.alias('session.user'),

    isNotOwnProfile: Ember.computed('user.id', 'currentUser.id', function () {
        return this.get('user.id') !== this.get('currentUser.id');
    }),

    isNotOwnersProfile: Ember.computed.not('user.isOwner'),

    isAdminUserOnOwnerProfile: Ember.computed.and('currentUser.isAdmin', 'user.isOwner'),

    canAssignRoles: Ember.computed.or('currentUser.isAdmin', 'currentUser.isOwner'),

    canMakeOwner: Ember.computed.and('currentUser.isOwner', 'isNotOwnProfile', 'user.isAdmin'),

    rolesDropdownIsVisible: Ember.computed.and('isNotOwnProfile', 'canAssignRoles', 'isNotOwnersProfile'),

    deleteUserActionIsVisible: Ember.computed('currentUser', 'canAssignRoles', 'user', function () {
        if ((this.get('canAssignRoles') && this.get('isNotOwnProfile') && !this.get('user.isOwner')) ||
            (this.get('currentUser.isEditor') && (this.get('isNotOwnProfile') ||
            this.get('user.isAuthor')))) {
            return true;
        }
    }),

    userActionsAreVisible: Ember.computed.or('deleteUserActionIsVisible', 'canMakeOwner'),

    user: Ember.computed.alias('model'),

    email: Ember.computed.readOnly('model.email'),

    slugValue: boundOneWay('model.slug'),

    lastPromise: null,

    // duplicated in gh-user-active -- find a better home and consolidate?

    userDefault: Ember.computed('ghostPaths', function () {
        return this.get('ghostPaths.url').asset('/shared/img/user-image.png');
    }),

    userImageBackground: Ember.computed('user.image', 'userDefault', function () {
        var url = this.get('user.image') || this.get('userDefault');

        return `background-image: url(${url})`.htmlSafe();
    }),

    // end duplicated

    coverDefault: Ember.computed('ghostPaths', function () {
        return this.get('ghostPaths.url').asset('/shared/img/user-cover.png');
    }),

    coverImageBackground: Ember.computed('user.cover', 'coverDefault', function () {
        var url = this.get('user.cover') || this.get('coverDefault');

        return `background-image: url(${url})`.htmlSafe();
    }),

    coverTitle: Ember.computed('user.name', function () {
        return this.get('user.name') + '\'s Cover Image';
    }),

    // Lazy load the slug generator for slugPlaceholder
    slugGenerator: Ember.computed(function () {
        return SlugGenerator.create({
            ghostPaths: this.get('ghostPaths'),
            slugType: 'user'
        });
    }),

    roles: Ember.computed(function () {
        return this.store.find('role', {permissions: 'assign'});
    }),

    actions: {
        changeRole: function (newRole) {
            this.set('model.role', newRole);
        },

        save: function () {
            var user = this.get('user'),
                slugValue = this.get('slugValue'),
                afterUpdateSlug = this.get('lastPromise'),
                promise,
                slugChanged,
                self = this;

            if (user.get('slug') !== slugValue) {
                slugChanged = true;
                user.set('slug', slugValue);
            }

            this.toggleProperty('submitting');

            promise = Ember.RSVP.resolve(afterUpdateSlug).then(function () {
                return user.save({format: false});
            }).then(function (model) {
                var currentPath,
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

                self.toggleProperty('submitting');

                return model;
            }).catch(function (errors) {
                if (errors) {
                    self.get('notifications').showErrors(errors);
                }

                self.toggleProperty('submitting');
            });

            this.set('lastPromise', promise);
        },

        password: function () {
            var user = this.get('user'),
                self = this;

            if (user.get('isPasswordValid')) {
                user.saveNewPassword().then(function (model) {
                    // Clear properties from view
                    user.setProperties({
                        password: '',
                        newPassword: '',
                        ne2Password: ''
                    });

                    self.get('notifications').showAlert('Password updated.', {type: 'success'});

                    return model;
                }).catch(function (errors) {
                    self.get('notifications').showAPIError(errors);
                });
            } else {
                // TODO: switch to in-line validation
                self.get('notifications').showErrors(user.get('passwordValidationErrors'));
            }
        },

        updateSlug: function (newSlug) {
            var self = this,
                afterSave = this.get('lastPromise'),
                promise;

            promise = Ember.RSVP.resolve(afterSave).then(function () {
                var slug = self.get('model.slug');

                newSlug = newSlug || slug;

                newSlug = newSlug.trim();

                // Ignore unchanged slugs or candidate slugs that are empty
                if (!newSlug || slug === newSlug) {
                    self.set('slugValue', slug);

                    return;
                }

                return self.get('slugGenerator').generateSlug(newSlug).then(function (serverSlug) {
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
                    var slugTokens = serverSlug.split('-'),
                        check = Number(slugTokens.pop());

                    // if the candidate slug is the same as the existing slug except
                    // for the incrementor then the existing slug should be used
                    if (isNumber(check) && check > 0) {
                        if (slug === slugTokens.join('-') && serverSlug !== newSlug) {
                            self.set('slugValue', slug);

                            return;
                        }
                    }

                    self.set('slugValue', serverSlug);
                });
            });

            this.set('lastPromise', promise);
        }
    }
});
