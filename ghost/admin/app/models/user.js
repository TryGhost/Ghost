/* eslint-disable camelcase */
import BaseModel from './base';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import config from 'ghost-admin/config/environment';
import {attr, hasMany} from '@ember-data/model';
import {computed} from '@ember/object';
import {equal, or} from '@ember/object/computed';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default BaseModel.extend(ValidationEngine, {
    ajax: service(),
    ghostPaths: service(),
    notifications: service(),
    search: service(),
    session: service(),

    config: inject(),

    validationType: 'user',

    name: attr('string'),
    slug: attr('string'),
    url: attr('string'),
    email: attr('string'),
    profileImage: attr('string'),
    coverImage: attr('string'),
    bio: attr('string'),
    website: attr('string'),
    location: attr('string'),
    accessibility: attr('string'),
    status: attr('string'),
    metaTitle: attr('string'),
    metaDescription: attr('string'),
    lastLoginUTC: attr('moment-utc'),
    createdAtUTC: attr('moment-utc'),
    createdBy: attr('number'),
    updatedAtUTC: attr('moment-utc'),
    updatedBy: attr('number'),
    roles: hasMany('role', {
        embedded: 'always',
        async: false
    }),
    count: attr('raw'),
    facebook: attr('facebook-url-user'),
    twitter: attr('twitter-url-user'),
    tour: attr('json-string'),
    commentNotifications: attr(),
    freeMemberSignupNotification: attr(),
    paidSubscriptionStartedNotification: attr(),
    paidSubscriptionCanceledNotification: attr(),
    mentionNotifications: attr(),
    milestoneNotifications: attr(),
    donationNotifications: attr(),

    // TODO: Once client-side permissions are in place,
    // remove the hard role check.
    isContributor: equal('role.name', 'Contributor'),
    isAuthor: equal('role.name', 'Author'),
    isEditor: equal('role.name', 'Editor'),
    isAdminOnly: equal('role.name', 'Administrator'),
    isOwnerOnly: equal('role.name', 'Owner'),
    isSuperEditor: equal('role.name', 'Super Editor'),
    isEitherEditor: or('isEditor', 'isSuperEditor'),

    // These are used in enough places that it's useful to throw them here
    isAdmin: or('isOwnerOnly', 'isAdminOnly'),
    isAuthorOrContributor: or('isAuthor', 'isContributor'),

    // adding some permisions-like properties, to facilitate future
    // switch to using the permissions system instead of role-based
    // hard-coded permissions
    canManageMembers: or('isAdmin', 'isSuperEditor'),
    canManageComments: or('isAdmin', 'isSuperEditor'),

    isLoggedIn: computed('id', 'session.user.id', function () {
        return this.id === this.get('session.user.id');
    }),

    isActive: computed('status', function () {
        // TODO: review "locked" as an "active" status
        return ['active', 'warn-1', 'warn-2', 'warn-3', 'warn-4', 'locked'].indexOf(this.status) > -1;
    }),

    isSuspended: equal('status', 'inactive'),
    isLocked: equal('status', 'locked'),

    role: computed('roles', {
        get() {
            return this.get('roles.firstObject');
        },
        set(key, value) {
            // Only one role per user, so remove any old data.
            this.roles.clear();
            this.roles.pushObject(value);

            return value;
        }
    }),

    profileImageUrl: computed('ghostPaths.assetRoot', 'profileImage', function () {
        // keep path separate so asset rewriting correctly picks it up
        let defaultImage = '/img/user-image.png';
        let defaultPath = (config.cdnUrl ? '' : this.ghostPaths.assetRoot.replace(/\/$/, '')) + defaultImage;
        return this.profileImage || defaultPath;
    }),

    coverImageUrl: computed('ghostPaths.assetRoot', 'coverImage', function () {
        // keep path separate so asset rewriting correctly picks it up
        let defaultImage = '/img/user-cover.png';
        let defaultPath = (config.cdnUrl ? '' : this.ghostPaths.assetRoot.replace(/\/$/, '')) + defaultImage;
        return this.coverImage || defaultPath;
    }),

    saveNewPasswordTask: task(function* () {
        const validation = this.isLoggedIn ? 'ownPasswordChange' : 'passwordChange';

        try {
            yield this.validate({property: validation});
        } catch (e) {
            // validation error, don't do anything
            return;
        }

        try {
            let url = this.ghostPaths.url.api('users', 'password');

            yield this.ajax.put(url, {
                data: {
                    password: [{
                        user_id: this.id,
                        oldPassword: this.password,
                        newPassword: this.newPassword,
                        ne2Password: this.ne2Password
                    }]
                }
            });

            this.password = '';
            this.newPassword = '';
            this.ne2Password = '';

            this.notifications.showNotification('Password updated', {type: 'success', key: 'user.change-password.success'});

            // clear errors manually for ne2password because validation
            // engine only clears the "validated property"
            // TODO: clean up once we have a better validations library
            this.errors.remove('ne2Password');

            return true;
        } catch (error) {
            this.notifications.showAPIError(error, {key: 'user.change-password'});
        }
    }).drop(),

    save() {
        const nameChanged = !!this.changedAttributes().name;

        const {url} = this;

        return this._super(...arguments).then((savedModel) => {
            const urlChanged = url !== savedModel.url;

            if (nameChanged || urlChanged || this.isDeleted) {
                this.search.expireContent();
            }

            return savedModel;
        });
    }
});
