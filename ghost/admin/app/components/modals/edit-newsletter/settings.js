import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class EditNewsletterSettingsForm extends Component {
    @service config;
    @service settings;

    @action
    onChange(property, event) {
        this.args.newsletter[property] = event.target.checked;
    }

    @action
    toggleProperty(property) {
        this.args.newsletter[property] = !this.args.newsletter[property];
    }

    @action
    onInput(property, event) {
        this.args.newsletter[property] = event.target.value;
    }
}
