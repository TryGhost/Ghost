import Component from '@glimmer/component';
import {action} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

export default class AccentColorFormField extends Component {
    @service settings;

    get accentColor() {
        const color = this.settings.get('accentColor');
        if (color && color[0] === '#') {
            return color.slice(1);
        }
        return color;
    }

    get accentColorPickerValue() {
        return this.settings.get('accentColor') || '#ffffff';
    }

    get accentColorBgStyle() {
        return htmlSafe(`background-color: ${this.accentColorPickerValue}`);
    }

    willDestroy() {
        super.willDestroy?.(...arguments);
        this.settings.errors.remove('accentColor');
    }

    @action
    async updateAccentColor(event) {
        let newColor = event.target.value;
        const oldColor = this.settings.get('accentColor');

        // reset errors and validation
        this.settings.errors.remove('accentColor');
        this.settings.hasValidated.removeObject('accentColor');

        if (newColor === '') {
            if (newColor === oldColor) {
                return;
            }

            // Don't allow empty accent color
            this.settings.errors.add('accentColor', 'Please select an accent color');
            this.settings.hasValidated.pushObject('accentColor');
            return;
        }

        // accentColor will be null unless the user has input something
        if (!newColor) {
            newColor = oldColor;
        }

        if (newColor[0] !== '#') {
            newColor = `#${newColor}`;
        }

        if (newColor.match(/#[0-9A-Fa-f]{6}$/)) {
            if (newColor === oldColor) {
                return;
            }

            this.settings.set('accentColor', newColor);
            this.args.didUpdate('accentColor', newColor);
        } else {
            this.settings.errors.add('accentColor', 'Please enter a color in hex format');
            this.settings.hasValidated.pushObject('accentColor');
        }
    }

    @task({restartable: true})
    *debounceUpdateAccentColor(event) {
        yield timeout(500);
        this.updateAccentColor(event);
    }

    @action
    blurElement(event) {
        event.preventDefault();
        event.target.blur();
    }
}
