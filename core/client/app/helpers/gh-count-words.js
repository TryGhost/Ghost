import Ember from 'ember';
import counter from 'ghost/utils/word-count';

const {Helper} = Ember;

export default Helper.helper(function (params) {
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
