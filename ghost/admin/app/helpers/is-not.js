import {helper} from '@ember/component/helper';

export function isNot(params) {
    return !params;
}

export default helper(function (params) {
    return isNot(params);
});
