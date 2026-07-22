import {helper} from '@ember/component/helper';
import {isEmpty} from '@ember/utils';

export function authorNames([authors]/*, hash*/) {
    if (!authors || isEmpty(authors)) {
        return;
    }

    return authors.mapBy('name').join(', ');
}

export default helper(authorNames);
