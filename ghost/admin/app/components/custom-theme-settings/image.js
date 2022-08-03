import Component from '@glimmer/component';
import {
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {action} from '@ember/object';
import {camelize} from '@ember/string';
import {guidFor} from '@ember/object/internals';

export default class CustomThemeSettingsImageComponent extends Component {
    inputId = `input-${guidFor(this)}`;
    inputName = camelize(this.args.setting.key);

    imageExtensions = IMAGE_EXTENSIONS;
    imageMimeTypes = IMAGE_MIME_TYPES;

    @action
    imageUploaded(images) {
        if (images[0]) {
            this.updateValue(images[0].url);
        }
    }

    @action
    updateValue(value) {
        this.args.setting.set('value', value);
        this.args.onChange?.();
    }
}
