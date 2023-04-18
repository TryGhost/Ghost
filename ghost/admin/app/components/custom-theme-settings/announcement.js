import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class CustomThemeSettingsAnnouncementComponent extends Component {
    @action
    // eslint-disable-next-line no-unused-vars
    onChangeHtml(html) {
        this.args.onChange?.();
    }
}
