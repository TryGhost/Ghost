import Component from '@glimmer/component';
import {action} from '@ember/object';
import {camelize} from '@ember/string';
import {guidFor} from '@ember/object/internals';
import {htmlSafe} from '@ember/template';
import {task, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class CustomThemeSettingsColorComponent extends Component {
    inputId = `input-${guidFor(this)}`;
    inputName = camelize(this.args.setting.key);

    @tracked isInvalid = false;

    get colorWithoutHash() {
        const color = this.args.setting.value;
        if (color && color[0] === '#') {
            return color.slice(1);
        }
        return color;
    }

    get colorPickerBgStyle() {
        return htmlSafe(`background-color: ${this.args.setting.value || '#ffffff'}`);
    }

    @action
    updateValue(event) {
        const oldColor = this.args.setting.value;
        let newColor = event.target.value;

        if (!newColor) {
            this.isInvalid = true;
            return;
        }

        if (newColor[0] !== '#') {
            newColor = `#${newColor}`;
        }

        if (newColor.match(/#[0-9A-Fa-f]{6}$/)) {
            this.isInvalid = false;

            if (newColor === oldColor) {
                return;
            }

            this.args.setting.set('value', newColor);
            this.args.onChange?.();
        } else {
            this.isInvalid = true;
        }
    }

    @task({restartable: true})
    *debounceValueUpdate(event) {
        yield timeout(500);
        this.updateValue(event);
    }

    @action
    blurElement(event) {
        event.target.blur();
    }
}
