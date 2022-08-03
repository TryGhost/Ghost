import Component from '@glimmer/component';
import config from 'ghost-admin/config/environment';
import {
    ICON_EXTENSIONS,
    ICON_MIME_TYPES,
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {action} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

export default class GhBrandSettingsFormComponent extends Component {
    @service ajax;
    @service config;
    @service ghostPaths;
    @service settings;
    @service frontend;

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

    get previewData() {
        const params = new URLSearchParams();

        params.append('c', this.accentColorPickerValue);
        params.append('icon', this.settings.get('icon'));
        params.append('logo', this.settings.get('logo'));
        params.append('cover', this.settings.get('coverImage'));

        return params.toString();
    }

    constructor() {
        super(...arguments);
        this.updatePreviewTask.perform();
    }

    willDestroy() {
        super.willDestroy?.(...arguments);
        this.settings.errors.remove('accentColor');
        this.settings.rollbackAttributes();
    }

    @action
    triggerFileDialog({target}) {
        target.closest('.gh-setting-action')?.querySelector('input[type="file"]')?.click();
    }

    @action
    async imageUploaded(property, results) {
        if (results[0]) {
            this.settings.set(property, results[0].url);
            this.updatePreviewTask.perform();
        }
    }

    @action
    async removeImage(imageName) {
        this.settings.set(imageName, '');
        this.updatePreviewTask.perform();
    }

    @action
    blurElement(event) {
        event.preventDefault();
        event.target.blur();
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
            this.updatePreviewTask.perform();
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

    @task
    *updatePreviewTask() {
        // skip during testing because we don't have mocks for the front-end
        if (config.environment === 'test') {
            return;
        }

        const previewResponse = yield this.frontend.fetch('/', {
            method: 'POST',
            headers: {
                'Content-Type': 'text/html;charset=utf-8',
                'x-ghost-preview': this.previewData,
                Accept: 'text/plain'
            }
        });
        const previewContents = yield previewResponse.text();

        // inject extra CSS to disable navigation and prevent clicks
        const injectedCss = `html { pointer-events: none; }`;

        const domParser = new DOMParser();
        const htmlDoc = domParser.parseFromString(previewContents, 'text/html');

        const stylesheet = htmlDoc.querySelector('style');
        const originalCSS = stylesheet.innerHTML;
        stylesheet.innerHTML = `${originalCSS}\n\n${injectedCss}`;

        const doctype = new XMLSerializer().serializeToString(htmlDoc.doctype);
        const html = doctype + htmlDoc.documentElement.outerHTML;

        // replace the iframe contents with the doctored preview html
        this.args.replacePreviewContents(html);
    }
}
