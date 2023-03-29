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
            style: 'background-color: ' + this.currentColor + ' !important;'
        };
    }

    get colorInputValue() {
        if (!this.currentColorObject.value || !this.currentColorObject.value.startsWith('#')) {
            return '#000000';
        }
        return this.currentColorObject.value;
    }

    @action
    onOpenColorPicker() {
        // This one is required because when choosing custom color, the initial color
        // is never fired in the input or change event, which can be annoying
        this.setCurrentColor(this.colorInputValue);
    }

    @action
    updateColorInputValue(event) {
        let newColor = event.target.value;

        if (!newColor) {
            // Invalid
            return;
        }

        if (newColor[0] !== '#') {
            newColor = `#${newColor}`;
        }

        if (newColor.match(/#[0-9A-Fa-f]{6}$/)) {
            this.setCurrentColor(newColor.toUpperCase());
        }
    }
}
