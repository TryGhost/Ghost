import Component from '@glimmer/component';
import {action} from '@ember/object';
import {camelize} from '@ember/string';
import {guidFor} from '@ember/object/internals';

export default class CustomThemeSettingsSelectComponent extends Component {
    selectId = `select-${guidFor(this)}`;
    selectName = camelize(this.args.setting.key);

    @action
    setSelection(changeEvent) {
        const value = changeEvent.target.value;
        this.args.setting.set('value', value);
        this.args.onChange?.();
    }
}
