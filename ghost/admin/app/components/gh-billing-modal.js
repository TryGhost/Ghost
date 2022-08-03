import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

@classic
export default class GhBillingModal extends Component {
    @service billing;

    @computed('billingWindowOpen')
    get visibilityClass() {
        return this.billingWindowOpen ? 'gh-billing' : 'gh-billing closed';
    }
}
