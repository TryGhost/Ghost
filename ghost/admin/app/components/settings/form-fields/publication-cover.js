import Component from '@glimmer/component';
import {
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class PublicationCoverFormField extends Component {
    @service feature;
    @service settings;

    @tracked showUnsplashSelector = false;

    imageExtensions = IMAGE_EXTENSIONS;
    imageMimeTypes = IMAGE_MIME_TYPES;

    @action
    imageUploaded(results) {
        if (results[0]) {
            this.update(results[0].url);
        }
    }

    @action
    update(value) {
        this.settings.coverImage = value;
        this.args.didUpdate('coverImage', value);
    }

    @action
    toggleUnsplashSelector() {
        this.showUnsplashSelector = !this.showUnsplashSelector;
    }

    @action
    saveImage(setFiles, imageFile) {
        setFiles([imageFile]);
    }

    @action
    setUnsplashImage({src}) {
        this.update(src);
    }
}
