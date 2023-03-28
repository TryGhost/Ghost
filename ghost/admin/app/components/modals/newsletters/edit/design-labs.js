import Component from '@glimmer/component';
import {IMAGE_EXTENSIONS} from 'ghost-admin/components/gh-image-uploader';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class EditNewsletterDesignForm extends Component {
    @service settings;

    imageExtensions = IMAGE_EXTENSIONS;

    @action
    onCheckboxChange(property, event) {
        this.args.newsletter[property] = event.target.checked;
    }

    @action
    toggleProperty(property) {
        this.args.newsletter[property] = !this.args.newsletter[property];
    }

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

    get backgroundPresetColors() {
        return [
            {
                value: 'dark',
                name: 'Black',
                class: 'black',
                style: ''
            },
            {
                value: 'light',
                name: 'White',
                class: 'white',
                style: ''
            }
        ];
    }

    get borderPresetColors() {
        return [
            {
                value: 'accent',
                name: 'Accent',
                class: 'accent',
                style: ''
            },
            {
                value: 'dark',
                name: 'Black',
                class: 'black',
                style: ''
            },
            {
                value: null,
                name: 'Transparent',
                class: 'transparent',
                style: ''
            }
        ];
    }

    get titlePresetColors() {
        return [
            {
                value: 'accent',
                name: 'Accent',
                class: 'accent',
                style: ''
            },
            {
                value: null,
                name: 'Auto',
                class: 'black',
                style: ''
            }
        ];
    }
}
