import Component from '@glimmer/component';
import {
    ICON_EXTENSIONS,
    ICON_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class PublicationIconFormField extends Component {
    @service settings;

    iconExtensions = ICON_EXTENSIONS;
    iconMimeTypes = ICON_MIME_TYPES;

    @action
    imageUploaded(results) {
        if (results[0]) {
            this.update(results[0].url);
        }
    }

    @action
    update(value) {
        this.settings.icon = value;
        this.args.didUpdate('icon', value);
    }
}
