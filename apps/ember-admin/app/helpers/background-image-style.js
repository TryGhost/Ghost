import {helper} from '@ember/component/helper';
import {htmlSafe} from '@ember/template';

export function backgroundImageStyle([url]/*, hash*/) {
    if (url) {
        const safeUrl = encodeURI(decodeURI(url));
        return htmlSafe(`background-image: url(${safeUrl});`);
    }

    return '';
}

export default helper(backgroundImageStyle);
