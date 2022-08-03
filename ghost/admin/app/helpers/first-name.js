import {helper} from '@ember/component/helper';

export function firstName([name = '']) {
    return name.split(' ')[0];
}

export default helper(firstName);