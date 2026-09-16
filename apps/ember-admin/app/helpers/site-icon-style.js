import Helper from '@ember/component/helper';
import {htmlSafe} from '@ember/template';
import {inject} from 'ghost-admin/decorators/inject';

export default class SiteIconStyleHelper extends Helper {
    @inject config;

    compute() {
        const icon = this.config.icon || 'https://static.ghost.org/v4.0.0/images/ghost-orb-2.png';
        return htmlSafe(`background-image: url(${icon})`);
    }
}
