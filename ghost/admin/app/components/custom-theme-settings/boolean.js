import Component from '@glimmer/component';
import {action} from '@ember/object';
import {camelize} from '@ember/string';
import {guidFor} from '@ember/object/internals';

export default class CustomThemeSettingsBooleanComponent extends Component {
    checkboxId = `checkbox-${guidFor(this)}`;
    checkboxName = camelize(this.args.setting.key);

    @action
    toggleValue(changeEvent) {
        const value = changeEvent.target.checked;
        this.args.setting.set('value', value);
        this.args.onChange?.();
    }
}
