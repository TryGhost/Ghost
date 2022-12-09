import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class GhBenefitItem extends Component {
    @action
    handleLabelInput(event) {
        this.updateLabel(event.target.value);
    }

    @action
    updateLabel(value) {
        this.args.updateLabel(value, this.args.benefitItem);
    }

    @action
    clearLabelErrors() {
        this.args.benefitItem.errors?.remove('name');
    }
}
