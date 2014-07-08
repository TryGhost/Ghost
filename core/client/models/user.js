var User = DS.Model.extend({
    uuid: DS.attr('string'),
    name: DS.attr('string'),
    slug: DS.attr('string'),
    password: DS.attr('string'),
    email: DS.attr('string'),
    image: DS.attr('string'),
    cover: DS.attr('string'),
    bio: DS.attr('string'),
    website: DS.attr('string'),
    location: DS.attr('string'),
    accessibility: DS.attr('string'),
    status: DS.attr('string'),
    language: DS.attr('string', {defaultValue: 'en_US'}),
    meta_title: DS.attr('string'),
    meta_description: DS.attr('string'),
    last_login: DS.attr('moment-date'),
    created_at: DS.attr('moment-date'),
    created_by: DS.attr('number'),
    updated_at: DS.attr('moment-date'),
    updated_by: DS.attr('number'),

    validationErrors: function () {
        var validationErrors = [];

        if (!validator.isLength(this.get('name'), 0, 150)) {
            validationErrors.push({message: 'Name is too long'});
        }

        if (!validator.isLength(this.get('bio'), 0, 200)) {
            validationErrors.push({message: 'Bio is too long'});
        }

        if (!validator.isEmail(this.get('email'))) {
            validationErrors.push({message: 'Please supply a valid email address'});
        }

        if (!validator.isLength(this.get('location'), 0, 150)) {
            validationErrors.push({message: 'Location is too long'});
        }

        if (!validator.isURL(this.get('website'), { protocols: ['http', 'https'], require_protocol: true }) ||
            !validator.isLength(this.get('website'), 0, 2000)) {
            validationErrors.push({message: 'Please use a valid url'});
        }

        return validationErrors;
    }.property('name', 'bio', 'email', 'location', 'website'),

    isValid: Ember.computed.empty('validationErrors.[]'),

    saveNewPassword: function (password) {
        var url = this.get('ghostPaths').adminUrl('changepw');
        return ic.ajax.request(url, {
            type: 'POST',
            data: password
        });
    },

    resendInvite: function () {
        var userData = {};

        userData.email = this.get('email');

        return ic.ajax.request(this.get('ghostPaths').apiUrl('users'), {
            type: 'POST',
            data: JSON.stringify({users: [userData]}),
            contentType: 'application/json'
        });
    },

    passwordValidationErrors: function (password) {
        var validationErrors = [];

        if (!validator.equals(password.newPassword, password.ne2Password)) {
            validationErrors.push('Your new passwords do not match');
        }

        if (!validator.isLength(password.newPassword, 8)) {
            validationErrors.push('Your password is not long enough. It must be at least 8 characters long.');
        }

        return validationErrors;
    },




});

export default User;
