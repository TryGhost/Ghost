import Ember from 'ember';
import counter from 'ghost/utils/cjk-character-count';

const {Helper} = Ember;

export default Helper.helper(function (params) {
    if (!params || !params.length) {
        return;
    }

    let markdown = params[0] || '';

    if (/^\s*$/.test(markdown)) {
        return '';
    }

    let count = counter(markdown);

    if (count === 0) {
        return '';
    } else {
        return count + (count === 1 ? ' CJK character' : ' CJK characters');
    }
});
