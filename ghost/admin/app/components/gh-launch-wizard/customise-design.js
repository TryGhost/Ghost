import Component from '@glimmer/component';
import {
    ICON_EXTENSIONS,
    ICON_MIME_TYPES,
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {action} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {timeout} from 'ember-concurrency';

export default class GhLaunchWizardCustomiseDesignComponent extends Component {
    @service settings;

    iconExtensions = ICON_EXTENSIONS;
    iconMimeTypes = ICON_MIME_TYPES;
    imageExtensions = IMAGE_EXTENSIONS;
    imageMimeTypes = IMAGE_MIME_TYPES;

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

    constructor() {
        super(...arguments);
        this.args.updatePreview('');
    }

    @action
    triggerFileDialog({target}) {
        target.closest('.gh-setting-action')?.querySelector('input[type="file"]')?.click();
    }

    @action
    async imageUploaded(property, results) {
        if (results[0]) {
            this.settings.set(property, results[0].url);
            await this.settings.save();
            this.args.refreshPreview();
        }
    }

    @action
    async removeImage(imageName) {
        this.settings.set(imageName, '');
        await this.settings.save();
        this.args.refreshPreview();
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

            // clear out the accent color
            this.settings.set('accentColor', '');
            await this.settings.save();
            this.args.refreshPreview();
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
            await this.settings.save();
            this.args.refreshPreview();
        } else {
            this.settings.errors.add('accentColor', 'The colour should be in valid hex format');
            this.settings.hasValidated.pushObject('accentColor');
        }
    }

    @task({restartable: true})
    *debounceUpdateAccentColor(event) {
        yield timeout(500);
        this.updateAccentColor(event);
    }
}
