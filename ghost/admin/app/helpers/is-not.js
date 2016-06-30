import {helper} from 'ember-helper';

export function isNot(params) {
    return !params;
}

export default helper(function (params) {
    return isNot(params);
});
