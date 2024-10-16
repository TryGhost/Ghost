import {countDownCharacters} from './gh-count-down-characters';
import {helper} from '@ember/component/helper';

export default helper(function (params) {
    let [content, maxCharacters] = params;

    if (!content) {
        // Protect against NULL content
        content = '';
    }

    // Strip HTML-tags and characters from content so we have a reliable character count
    content = content.replace(/<[^>]*>?/gm, '');
    content = content.replace(/&nbsp;/g, ' ');
    content = content.replace(/&amp;/g, '&');
    content = content.replace(/&quot;/g, '"');
    content = content.replace(/&lt;/g, '<');
    content = content.replace(/&gt;/g, '>');

    return countDownCharacters([content, maxCharacters]);
});
