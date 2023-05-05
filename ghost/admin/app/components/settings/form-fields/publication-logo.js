import Component from '@glimmer/component';
import {
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class PublicationLogoFormField extends Component {
    @service settings;

    imageExtensions = IMAGE_EXTENSIONS;
    imageMimeTypes = IMAGE_MIME_TYPES;

    @action
    imageUploaded(results) {
        if (results[0]) {
            this.update(results[0].url);
        }
    }

    @action
    saveImage(setFiles, imageFile) {
        setFiles([imageFile]);
    }

    @action
    update(value) {
        this.settings.logo = value;
        this.args.didUpdate('logo', value);
    }
}
