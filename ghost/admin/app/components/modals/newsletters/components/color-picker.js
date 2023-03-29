import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class ColorPicker extends Component {
    @tracked
        orderedPresetColors = [];
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
        }
    }

    @action
    onMouseLeave() {
        this.mouseOver = false;

        if (this.timer) {
            clearTimeout(this.timer);
        }

        // Wait 200ms after the animation to update
        // we need to do this on mouse leave, because on mouse enter it breaks the animations
        this.timer = setTimeout(() => {
            if (!this.mouseOver) {
                this.updateOrderedPresetColors();
            }
            this.timer = null;
        }, 500);
    }

    @action
    updateOrderedPresetColors() {
        this.didSelectCustomColor = false;

        const customColorSelected = !this.presetColors.find(c => c.value === this.currentColor);
        const orderedPresetColors = this.presetColors.filter(c => c.value !== this.currentColor);
        if (!customColorSelected) {
            // Never append custom colors here
            orderedPresetColors.push(this.currentColorObject);
        } else {
            // Append custom
            //orderedPresetColors.push({
        }
        this.orderedPresetColors = orderedPresetColors;
    }

    get dynamicOrderedPresetColors() {
        // Createa deep clone so we don't update anything
        const arr = [...this.orderedPresetColors.map((c) => {
            return {...c};
        })];

        // Make sure all preset colors are presents
        for (const preset of this.presetColors) {
            if (!arr.find(c => c.value === preset.value)) {
                arr.push({...preset});
            }
        }

        return arr;
    }

    get customColorSelected() {
        if (!this.dynamicOrderedPresetColors.find(c => c.value === this.currentColor)) {
            return true;
        }
        return false;
    }

    get customColorStyle() {
        // Make sure the current color is present
        if (this.customColorSelected) {
            return 'background: ' + this.currentColor + ' !important;';
        } else {
            if (this.lastSelectedCustomColor && this.didSelectCustomColor) {
                return 'background: ' + this.lastSelectedCustomColor + ' !important;';
            }
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
        if (this.lastSelectedCustomColor) {
            return this.lastSelectedCustomColor;
        }
        if (!this.currentColorObject.value || !this.currentColorObject.value.startsWith('#')) {
            return '#000000';
        }
        return this.currentColorObject.value;
    }

    @action
    onOpenColorPicker() {
        this.didSelectCustomColor = true;
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
