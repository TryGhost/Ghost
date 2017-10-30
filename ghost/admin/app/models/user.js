/* eslint-disable camelcase */
import Model from 'ember-data/model';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import attr from 'ember-data/attr';
import {computed} from '@ember/object';
import {equal} from '@ember/object/computed';
import {hasMany} from 'ember-data/relationships';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Model.extend(ValidationEngine, {
    validationType: 'user',

    name: attr('string'),
    slug: attr('string'),
    email: attr('string'),
    profileImage: attr('string'),
    coverImage: attr('string'),
    bio: attr('string'),
    website: attr('string'),
    location: attr('string'),
    accessibility: attr('string'),
    status: attr('string'),
    locale: attr('string'),
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

    ghostPaths: service(),
    ajax: service(),
    session: service(),
    notifications: service(),
    config: service(),

    // TODO: Once client-side permissions are in place,
    // remove the hard role check.
    isAuthor: equal('role.name', 'Author'),
    isEditor: equal('role.name', 'Editor'),
    isAdmin: equal('role.name', 'Administrator'),
    isOwner: equal('role.name', 'Owner'),

    isLoggedIn: computed('id', 'session.user.id', function () {
        return this.get('id') === this.get('session.user.id');
    }),

    isActive: computed('status', function () {
        // TODO: review "locked" as an "active" status
        return ['active', 'warn-1', 'warn-2', 'warn-3', 'warn-4', 'locked'].indexOf(this.get('status')) > -1;
    }),

    isSuspended: equal('status', 'inactive'),
    isLocked: equal('status', 'locked'),

    role: computed('roles', {
        get() {
            return this.get('roles.firstObject');
        },
        set(key, value) {
            // Only one role per user, so remove any old data.
            this.get('roles').clear();
            this.get('roles').pushObject(value);

            return value;
        }
    }),

    saveNewPassword: task(function* () {
        let validation = this.get('isLoggedIn') ? 'ownPasswordChange' : 'passwordChange';

        try {
            yield this.validate({property: validation});
        } catch (e) {
            // validation error, don't do anything
            return;
        }

        try {
            let url = this.get('ghostPaths.url').api('users', 'password');

            yield this.get('ajax').put(url, {
                data: {
                    password: [{
                        user_id: this.get('id'),
                        oldPassword: this.get('password'),
                        newPassword: this.get('newPassword'),
                        ne2Password: this.get('ne2Password')
                    }]
                }
            });

            this.setProperties({
                password: '',
                newPassword: '',
                ne2Password: ''
            });

            this.get('notifications').showNotification('Password updated.', {type: 'success', key: 'user.change-password.success'});

            // clear errors manually for ne2password because validation
            // engine only clears the "validated proeprty"
            // TODO: clean up once we have a better validations library
            this.get('errors').remove('ne2Password');

            return true;
        } catch (error) {
            this.get('notifications').showAPIError(error, {key: 'user.change-password'});
        }
    }).drop()
});
