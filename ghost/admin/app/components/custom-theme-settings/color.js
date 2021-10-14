import Component from '@glimmer/component';
import {action} from '@ember/object';
import {camelize} from '@ember/string';
import {guidFor} from '@ember/object/internals';
import {htmlSafe} from '@ember/template';
import {task} from 'ember-concurrency-decorators';
import {timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const diagonalLineCss = `
    linear-gradient(to top left,
        rgba(0,0,0,0) 0%,
        rgba(0,0,0,0) calc(50% - 0.8px),
        rgba(255,0,0,1) 50%,
        rgba(0,0,0,0) calc(50% + 0.8px),
        rgba(0,0,0,0) 100%);
`;

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

    get colorInputValue() {
        return this.args.setting.value || '#ffffff';
    }

    get colorPickerBgStyle() {
        if (this.args.setting.value) {
            return htmlSafe(`background-color: ${this.args.setting.value}`);
        }

        return htmlSafe(`background: ${diagonalLineCss}; border: 1px solid lightgray;`);
    }

    get colorInputStyle() {
        return htmlSafe(this.args.setting.value ? '' : 'opacity: 0;');
    }

    @action
    updateValue(event) {
        let newColor = event.target.value;
        const oldColor = this.args.setting.value;

        if (!newColor) {
            this.isInvalid = false;
            this.args.setting.set('value', null);
            this.args.onChange?.();
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
