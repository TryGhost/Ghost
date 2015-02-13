import Ember from 'ember';
var ResetValidator = Ember.Object.create({
    check: function (model) {
        var p1 = model.get('newPassword'),
            p2 = model.get('ne2Password'),
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
