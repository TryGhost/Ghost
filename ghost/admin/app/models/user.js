/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Ember from 'ember';
import DS from 'ember-data';
import {request as ajax} from 'ic-ajax';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {computed, inject} = Ember;
const {equal, empty} = computed;
const {Model, attr, hasMany} = DS;

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
    meta_title: attr('string'),
    meta_description: attr('string'),
    last_login: attr('moment-date'),
    created_at: attr('moment-date'),
    created_by: attr('number'),
    updated_at: attr('moment-date'),
    updated_by: attr('number'),
    roles: hasMany('role', {
        embedded: 'always',
        async: false
    }),
    count: DS.attr('raw'),

    ghostPaths: inject.service('ghost-paths'),

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

        return ajax(url, {
            type: 'PUT',
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

        return ajax(this.get('ghostPaths.url').api('users'), {
            type: 'POST',
            data: JSON.stringify({users: [userData]}),
            contentType: 'application/json'
        });
    }
});
