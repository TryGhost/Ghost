import {helper} from '@ember/component/helper';

export default helper(function ([set, key]) {
    return set.has(key);
});
