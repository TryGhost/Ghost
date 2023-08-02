import Component from '@glimmer/component';
import SignupFormEmbedModal from '../../components/modals/settings/signup-form-embed';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class SignupFormEmbed extends Component {
    @service modals;
    @service settings;

    @tracked currency = 'USD';
    @tracked allCurrencies = ['USD', 'RSD'];

    @action
    open() {
        this.modals.open(SignupFormEmbedModal, {}, {});
    }

    @task
    *copyTipsAndDonationsLink() {
        yield timeout(10);
        return true;
    }
}
