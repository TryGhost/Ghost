import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class ColorPicker extends Component {
    get presetColors() {
        return this.args.presetColors ?? [];
    }

    get currentColor() {
        return this.args.color || null;
    }

    set currentColor(value) {
        this.args.onColorChange(value);
    }

    @action
    setCurrentColor(value) {
        this.currentColor = value;
    }

    get availablePresetColors() {
        return this.presetColors.filter(preset => preset.value !== this.currentColor);
    }

    get currentColorObject() {
        for (const preset of this.presetColors) {
            if (preset.value === this.currentColor) {
                return preset;
            }
        }
        return {
            value: this.currentColor,
            name: this.currentColor,
            class: 'custom-value',
            style: 'background-color: ' + this.currentColor + ';'
        };
    }
}
