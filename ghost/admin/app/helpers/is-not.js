import Ember from 'ember';

export function isNot(params) {
    return !params;
}

export default Ember.Helper.helper(function (params) {
    return isNot(params);
});
