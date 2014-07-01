var ResetValidator = Ember.Object.create({
    check: function (model) {

        var data = model.getProperties('passwords'),
            p1 = data.passwords.newPassword,
            p2 = data.passwords.ne2Password,
            validationErrors = [];

        if (!validator.equals(p1, p2)) {
            validationErrors.push({
                message: 'The two new passwords don\'t match.'
            });
        }

        if (!validator.isLength(p1, 8)) {
            validationErrors.push({
                message: 'The password is not long enough.'
            });
        }
        return validationErrors;
    }
});

export default ResetValidator;
