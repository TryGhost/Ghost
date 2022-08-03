import {helper} from '@ember/component/helper';
import {humanize} from 'ember-cli-string-helpers/helpers/humanize';

export function humanizeSettingKey([key]) {
    let humanized = humanize([key]);

    const allCaps = ['API', 'CTA', 'RSS'];

    allCaps.forEach((str) => {
        const regex = new RegExp(`(^| )(${str})( |$)`, 'gi');
        humanized = humanized.replace(regex, `$1${str}$3`);
    });

    return humanized;
}

export default helper(humanizeSettingKey);
