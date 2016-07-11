/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import {hasMany} from 'ember-data/relationships';
import computed, {equal} from 'ember-computed';
import injectService from 'ember-service/inject';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';

export default Model.extend(ValidationEngine, {
    validationType: 'user',

    uuid: attr('string'),
    name: attr('string'),
    slug: attr('string'),
    email: attr('string'),
    image: attr('string'),
    cover: attr('string'),
    bio: attr('string'),
    website: attr('string'),
    location: attr('string'),
    accessibility: attr('string'),
    status: attr('string'),
    language: attr('string', {defaultValue: 'en_US'}),
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

    ghostPaths: injectService(),
    ajax: injectService(),
    session: injectService(),

    // TODO: Once client-side permissions are in place,
    // remove the hard role check.
    isAuthor: equal('role.name', 'Author'),
    isEditor: equal('role.name', 'Editor'),
    isAdmin: equal('role.name', 'Administrator'),
    isOwner: equal('role.name', 'Owner'),

    isLoggedIn: computed('id', 'session.user.id', function () {
        return this.get('id') === this.get('session.user.id');
    }),

    active: computed('status', function () {
        return ['active', 'warn-1', 'warn-2', 'warn-3', 'warn-4', 'locked'].indexOf(this.get('status')) > -1;
    }),

    invited: computed('status', function () {
        return ['invited', 'invited-pending'].indexOf(this.get('status')) > -1;
    }),

    pending: equal('status', 'invited-pending'),

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

    saveNewPassword() {
        let url = this.get('ghostPaths.url').api('users', 'password');
        let validation = this.get('isLoggedIn') ? 'ownPasswordChange' : 'passwordChange';

        return this.validate({property: validation}).then(() => {
            return this.get('ajax').put(url, {
                data: {
                    password: [{
                        user_id: this.get('id'),
                        oldPassword: this.get('password'),
                        newPassword: this.get('newPassword'),
                        ne2Password: this.get('ne2Password')
                    }]
                }
            });
        });
    },

    resendInvite() {
        let fullUserData = this.toJSON();
        let userData = {
            email: fullUserData.email,
            roles: fullUserData.roles
        };
        let inviteUrl = this.get('ghostPaths.url').api('users');

        return this.get('ajax').post(inviteUrl, {
            data: JSON.stringify({users: [userData]}),
            contentType: 'application/json'
        });
    }
});
