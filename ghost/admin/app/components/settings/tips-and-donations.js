import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class TipsAndDonations extends Component {
    @service settings;

    @tracked currency = 'USD';
    @tracked allCurrencies = ['USD', 'RSD'];

    @task
    *copyTipsAndDonationsLink() {
        yield timeout(10);
        return true;
    }
}
