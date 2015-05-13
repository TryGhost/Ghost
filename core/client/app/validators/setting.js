import Ember from 'ember';
var SettingValidator = Ember.Object.create({
    check: function (model) {
        var validationErrors = [],
            title = model.get('title'),
            description = model.get('description'),
            email = model.get('email'),
            postsPerPage = model.get('postsPerPage'),
            isPrivate    = model.get('isPrivate'),
            password     = model.get('password');

        if (!validator.isLength(title, 0, 150)) {
            validationErrors.push({message: 'Title is too long'});
        }

        if (!validator.isLength(description, 0, 200)) {
            validationErrors.push({message: 'Description is too long'});
        }

        if (!validator.isEmail(email) || !validator.isLength(email, 0, 254)) {
            validationErrors.push({message: 'Supply a valid email address'});
        }

        if (isPrivate && password === '') {
            validationErrors.push({message: 'Password must be supplied'});
        }

        if (postsPerPage > 1000) {
            validationErrors.push({message: 'The maximum number of posts per page is 1000'});
        }

        if (postsPerPage < 1) {
            validationErrors.push({message: 'The minimum number of posts per page is 1'});
        }

        if (!validator.isInt(postsPerPage)) {
            validationErrors.push({message: 'Posts per page must be a number'});
        }

        return validationErrors;
    }
});

export default SettingValidator;
