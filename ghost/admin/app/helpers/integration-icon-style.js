import {helper} from '@ember/component/helper';
import {htmlSafe} from '@ember/template';

export function integrationLogoStyle([integration]/*, hash*/) {
    if (integration.iconImage) {
        let style = `background-image:url(${integration.iconImage});background-size:36px;`;
        return htmlSafe(style);
    }
}

export default helper(integrationLogoStyle);
