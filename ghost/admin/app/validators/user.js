import BaseValidator from './base';
import PasswordValidatorMixin from './mixins/password';
import validator from 'validator';
import {isBlank} from '@ember/utils';

const userValidator = BaseValidator.extend(PasswordValidatorMixin, {
    init() {
        this.properties = this.properties || ['name', 'bio', 'email', 'location', 'website', 'roles'];
        this._super(...arguments);
    },

    isActive(model) {
        return (model.status === 'active');
    },

    name(model) {
        let name = model.name;

        if (this.isActive(model)) {
            if (isBlank(name)) {
                model.errors.add('name', 'Please enter a name.');
                this.invalidate();
            } else if (!validator.isLength(name, 0, 191)) {
                model.errors.add('name', 'Name is too long');
                this.invalidate();
            }
        }
    },

    bio(model) {
        let bio = model.bio;

        if (this.isActive(model)) {
            if (!validator.isLength(bio || '', 0, 200)) {
                model.errors.add('bio', 'Bio is too long');
                this.invalidate();
            }
        }
    },

    email(model) {
        let email = model.email;

        if (!validator.isEmail(email || '')) {
            model.errors.add('email', 'Please supply a valid email address');
            this.invalidate();
        }

        if (!validator.isLength(email || '', 0, 191)) {
            model.errors.add('email', 'Email is too long');
            this.invalidate();
        }
    },

    location(model) {
        let location = model.location;

        if (this.isActive(model)) {
            if (!validator.isLength(location || '', 0, 150)) {
                model.errors.add('location', 'Location is too long');
                this.invalidate();
            }
        }
    },

    website(model) {
        let website = model.website;
        // eslint-disable-next-line camelcase
        let isInvalidWebsite = !validator.isURL(website || '', {require_protocol: false})
                          || !validator.isLength(website || '', 0, 2000);

        if (this.isActive(model)) {
            if (!isBlank(website) && isInvalidWebsite) {
                model.errors.add('website', 'Website is not a valid url');
                this.invalidate();
            }
        }
    },

    roles(model) {
        if (!this.isActive(model)) {
            let roles = model.roles;

            if (roles.length < 1) {
                model.errors.add('role', 'Please select a role');
                this.invalidate();
            }
        }
    },

    passwordChange(model) {
        let newPassword = model.newPassword;
        let ne2Password = model.ne2Password;

        // validation only marks the requested property as validated so we
        // have to add properties manually
        model.hasValidated.addObject('newPassword');
        model.hasValidated.addObject('ne2Password');

        if (isBlank(newPassword) && isBlank(ne2Password)) {
            model.errors.add('newPassword', 'Sorry, passwords can\'t be blank');
            this.invalidate();
        } else {
            if (!validator.equals(newPassword, ne2Password || '')) {
                model.errors.add('ne2Password', 'Your new passwords do not match');
                this.invalidate();
            }

            this.passwordValidation(model, newPassword, 'newPassword');
        }
    },

    ownPasswordChange(model) {
        let oldPassword = model.password;

        this.passwordChange(model);

        // validation only marks the requested property as validated so we
        // have to add properties manually
        model.hasValidated.addObject('password');

        if (isBlank(oldPassword)) {
            model.errors.add('password', 'Your current password is required to set a new one');
            this.invalidate();
        }
    }
});

export default userValidator.create();
