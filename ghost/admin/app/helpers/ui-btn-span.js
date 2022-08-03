import {btnStyles} from './ui-btn';
import {helper} from '@ember/component/helper';

export function uiBtnSpan([style], hash) {
    return btnStyles(Object.assign({}, {style}, hash)).span;
}

export default helper(uiBtnSpan);
