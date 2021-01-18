import Component from '@glimmer/component';
import {
    ICON_EXTENSIONS,
    ICON_MIME_TYPES,
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class GhLaunchWizardCustomiseDesignComponent extends Component {
    @service settings;

    @tracked previewGuid;

    iconExtensions = ICON_EXTENSIONS;
    iconMimeTypes = ICON_MIME_TYPES;
    imageExtensions = IMAGE_EXTENSIONS;
    imageMimeTypes = IMAGE_MIME_TYPES;

    constructor() {
        super(...arguments);
        this.refreshPreview();
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
            this.refreshPreview();
        }
    }

    @action
    async removeImage(imageName) {
        this.settings.set(imageName, '');
        await this.settings.save();
        this.refreshPreview();
    }

    refreshPreview() {
        this.previewGuid = (new Date()).valueOf();
    }
}
