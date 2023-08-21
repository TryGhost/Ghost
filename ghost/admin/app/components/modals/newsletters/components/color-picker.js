import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class ColorPicker extends Component {
    @tracked
        mouseOver = false;
    @tracked
        lastSelectedCustomColor = null;

    /**
     * Whether the custom color was changed during the current hover
     */
    @tracked
        didSelectCustomColor = false;

    timer;

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

    @action
    onMouseEnter() {
        this.mouseOver = true;

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        if (this.customColorSelected) {
            this.didSelectCustomColor = true;
            this.lastSelectedCustomColor = this.currentColor;
        }
    }

    @action
    onMouseLeave() {
        this.mouseOver = false;

        if (this.timer) {
            clearTimeout(this.timer);
        }

        // Wait until the animation is complete
        this.timer = setTimeout(() => {
            this.didSelectCustomColor = false;
            this.timer = null;
        }, 350);
    }

    get customColorSelected() {
        if (!this.presetColors.find(c => c.value === this.currentColor)) {
            return true;
        }
        return false;
    }

    get customColorStyle() {
        // Make sure the current color is present
        if (this.customColorSelected) {
            return 'background: ' + this.currentColor + ' !important;';
        }
        return '';
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
            style: 'background: ' + this.currentColor + ' !important;'
        };
    }

    get colorInputValue() {
        if (!this.currentColorObject.value || !this.currentColorObject.value.startsWith('#')) {
            return '#999999';
        }
        return this.currentColorObject.value;
    }

    @action
    onOpenColorPicker() {
        this.didSelectCustomColor = true;
        this.lastSelectedCustomColor = this.colorInputValue;
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
            this.lastSelectedCustomColor = newColor.toUpperCase();
            this.setCurrentColor(newColor.toUpperCase());
        }
    }
}
