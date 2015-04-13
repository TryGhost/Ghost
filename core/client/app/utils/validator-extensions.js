import Ember from 'ember';
function init() {
    // Provide a few custom validators
    //
    validator.extend('empty', function (str) {
        return Ember.isBlank(str);
    });

    validator.extend('notContains', function (str, badString) {
        return str.indexOf(badString) === -1;
    });
}

export default {
    init: init
};
