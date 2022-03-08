import Helper from '@ember/component/helper';
import classic from 'ember-classic-decorator';
import {htmlSafe} from '@ember/template';
import {inject as service} from '@ember/service';

@classic
export default class SiteIconStyleHelper extends Helper {
    @service config;

    compute() {
        const icon = this.get('config.icon') || 'https://static.ghost.org/v4.0.0/images/ghost-orb-2.png';
        return htmlSafe(`background-image: url(${icon})`);
    }
}