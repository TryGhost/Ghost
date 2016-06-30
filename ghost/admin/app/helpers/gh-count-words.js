import {helper} from 'ember-helper';
import counter from 'ghost-admin/utils/word-count';

export default helper(function (params) {
    if (!params || !params.length) {
        return;
    }

    let markdown = params[0] || '';

    if (/^\s*$/.test(markdown)) {
        return '0 words';
    }

    let count = counter(markdown);

    return count + (count === 1 ? ' word' : ' words');
});
