var SettingValidator = Ember.Object.create({
    check: function (model) {
        var validationErrors = [],
            title = model.get('title'),
            description = model.get('description'),
            email = model.get('email'),
            postsPerPage = model.get('postsPerPage');

        if (!validator.isLength(title, 0, 150)) {
            validationErrors.push({ message: 'Title is too long' });
        }

        if (!validator.isLength(description, 0, 200)) {
            validationErrors.push({ message: 'Description is too long' });
        }

        if (!validator.isEmail(email) || !validator.isLength(email, 0, 254)) {
            validationErrors.push({ message: 'Please supply a valid email address' });
        }

        if (!validator.isInt(postsPerPage) || postsPerPage > 1000) {
            validationErrors.push({ message: 'Please use a number less than 1000' });
        }

        if (!validator.isInt(postsPerPage) || postsPerPage < 0) {
            validationErrors.push({ message: 'Please use a number greater than 0' });
        }

        return validationErrors;
    }
});

export default SettingValidator;
