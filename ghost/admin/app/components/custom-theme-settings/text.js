import Component from '@glimmer/component';
import {action} from '@ember/object';
import {camelize} from '@ember/string';
import {guidFor} from '@ember/object/internals';

export default class CustomThemeSettingsTextComponent extends Component {
    inputId = `input-${guidFor(this)}`;
    inputName = camelize(this.args.setting.key);

    @action
    updateValue(event) {
        this.args.setting.set('value', event.target.value);
    }

    @action
    triggerOnChange() {
        this.args.onChange?.();
    }
}
