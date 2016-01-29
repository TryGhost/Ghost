import Ember from 'ember';

const {Helper} = Ember;

export function isEqual(params) {
    let [lhs, rhs] = params;

    return lhs === rhs;
}

export default Helper.helper(function (params) {
    return isEqual(params);
});
