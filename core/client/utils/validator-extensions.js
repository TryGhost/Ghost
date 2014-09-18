function init() {
    // Provide a few custom validators
    //
    validator.extend('empty', function (str) {
        return Ember.isBlank(str);
    });

    validator.extend('notContains', function (str, badString) {
        return !_.contains(str, badString);
    });
}

export default {
    init: init
};
