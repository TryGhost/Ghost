import Component from '@glimmer/component';
import {IMAGE_EXTENSIONS} from 'ghost-admin/components/gh-image-uploader';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {textColorForBackgroundColor} from '@tryghost/color-utils';

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

    get backgroundColorIsDark() {
        if (this.args.newsletter.backgroundColor === 'dark') {
            return true;
        }
        if (this.args.newsletter.backgroundColor === 'light') {
            return false;
        }
        return textColorForBackgroundColor(this.args.newsletter.backgroundColor).hex().toLowerCase() === '#ffffff';
    }

    get backgroundPresetColors() {
        return [
            {
                value: '#f0f0f0',
                name: 'Lightgrey',
                class: '',
                style: 'background: #f0f0f0 !important;'
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
                value: 'auto',
                name: 'Auto',
                class: this.backgroundColorIsDark ? 'white' : 'black',
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
                class: this.backgroundColorIsDark ? 'white' : 'black',
                style: ''
            }
        ];
    }
}
