import Helper from '@ember/component/helper';
import classic from 'ember-classic-decorator';
import {htmlSafe} from '@ember/template';
import {inject as service} from '@ember/service';

@classic
export default class AccentColorBackgroundHelper extends Helper {
    @service config;

    compute() {
        const color = this.get('config.accent_color');
        return htmlSafe(`background: ${color};`);
    }
}