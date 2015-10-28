import Ember from 'ember';

const {isBlank} = Ember;

function init() {
    // Provide a few custom validators
    //
    validator.extend('empty', function (str) {
        return isBlank(str);
    });

    validator.extend('notContains', function (str, badString) {
        return str.indexOf(badString) === -1;
    });
}

export default {
    init
};
