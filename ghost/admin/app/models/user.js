/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Ember from 'ember';
import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import { hasMany } from 'ember-data/relationships';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {
    computed,
    inject: {service}
} = Ember;
const {equal, empty} = computed;

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
    lastLogin: attr('moment-date'),
    createdAt: attr('moment-date'),
    createdBy: attr('number'),
    updatedAt: attr('moment-date'),
    updatedBy: attr('number'),
    roles: hasMany('role', {
        embedded: 'always',
        async: false
    }),
    count: attr('raw'),

    ghostPaths: service(),
    ajax: service(),

    // TODO: Once client-side permissions are in place,
    // remove the hard role check.
    isAuthor: equal('role.name', 'Author'),
    isEditor: equal('role.name', 'Editor'),
    isAdmin: equal('role.name', 'Administrator'),
    isOwner: equal('role.name', 'Owner'),

    isPasswordValid: empty('passwordValidationErrors.[]'),

    active: computed('status', function () {
        return ['active', 'warn-1', 'warn-2', 'warn-3', 'warn-4', 'locked'].indexOf(this.get('status')) > -1;
    }),

    invited: computed('status', function () {
        return ['invited', 'invited-pending'].indexOf(this.get('status')) > -1;
    }),

    pending: equal('status', 'invited-pending').property('status'),

    passwordValidationErrors: computed('password', 'newPassword', 'ne2Password', function () {
        let validationErrors = [];

        if (!validator.equals(this.get('newPassword'), this.get('ne2Password'))) {
            validationErrors.push({message: 'Your new passwords do not match'});
        }

        if (!validator.isLength(this.get('newPassword'), 8)) {
            validationErrors.push({message: 'Your password is not long enough. It must be at least 8 characters long.'});
        }

        return validationErrors;
    }),

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
