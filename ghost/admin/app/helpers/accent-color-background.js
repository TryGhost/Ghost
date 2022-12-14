import Helper from '@ember/component/helper';
import {htmlSafe} from '@ember/template';
import {inject} from 'ghost-admin/decorators/inject';

export default class AccentColorBackgroundHelper extends Helper {
    @inject config;

    compute() {
        const color = this.config.accent_color;
        return htmlSafe(`background: ${color};`);
    }
}
