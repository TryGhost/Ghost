import Component from '@glimmer/component';
import {IMAGE_EXTENSIONS} from 'ghost-admin/components/gh-image-uploader';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class EditNewsletterDesignForm extends Component {
    @service settings;

    imageExtensions = IMAGE_EXTENSIONS;

    @action
    imageUploaded(property, images) {
        if (images[0]) {
            this.args.newsletter[property] = images[0].url;
        }
    }

    @action
    changeSetting(property, value) {
        this.args.newsletter[property] = value;
    }

    @action
    toggleSetting(property, event) {
        this.args.newsletter[property] = event.target.checked;
    }
}
