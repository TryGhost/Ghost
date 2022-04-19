import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class EditNewsletterSettingsForm extends Component {
    @service settings;

    @action
    onCheckboxChange(property, event) {
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

    @action
    onValueChange(property, value) {
        this.args.newsletter[property] = value;
    }

    @action
    setOptInExisting(event) {
        this.args.setOptInExisting(event.target.value);
    }

    @action
    toggleOptInExisting() {
        this.args.setOptInExisting(!this.args.optInExisting);
    }
}
