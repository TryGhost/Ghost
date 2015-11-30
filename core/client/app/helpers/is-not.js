import Ember from 'ember';

const {Helper} = Ember;

export function isNot(params) {
    return !params;
}

export default Helper.helper(function (params) {
    return isNot(params);
});
