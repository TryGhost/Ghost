import Ember from 'ember';

export function isEqual(params) {
    var [lhs, rhs] = params;

    return lhs === rhs;
}

export default Ember.Helper.helper(function (params) {
    return isEqual(params);
});
