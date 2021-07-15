import Component from '@glimmer/component';
import {htmlSafe} from '@ember/template';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';

export default class GhLaunchWizardFinaliseComponent extends Component {
    @service feature;
    @service notifications;
    @service router;
    @service settings;

    willDestroy() {
        super.willDestroy?.(...arguments);
        // clear any unsaved settings changes when going back/forward/closing
        this.settings.rollbackAttributes();
    }

    async saveProduct() {
        const data = this.args.getData();
        this.product = data?.product;
        if (this.product) {
            const monthlyAmount = data.monthlyAmount * 100;
            const yearlyAmount = data.yearlyAmount * 100;
            const currency = data.currency;
            const monthlyPrice = {
                nickname: 'Monthly',
                amount: monthlyAmount,
                active: 1,
                currency: currency,
                interval: 'month',
                type: 'recurring'
            };
            const yearlyPrice = {
                nickname: 'Yearly',
                amount: yearlyAmount,
                active: 1,
                currency: currency,
                interval: 'year',
                type: 'recurring'
            };
            this.product.set('monthlyPrice', monthlyPrice);
            this.product.set('yearlyPrice', yearlyPrice);
            const savedProduct = await this.product.save();
            return savedProduct;
        }
    }

    @task
    *finaliseTask() {
        const data = this.args.getData();
        if (data?.product) {
            yield this.saveProduct();
            yield this.settings.save();
        }
        yield this.feature.set('launchComplete', true);
        this.router.transitionTo('dashboard');
        this.notifications.showNotification(
            'Launch complete!',
            {type: 'success', actions: htmlSafe('<a href="#/posts">Start creating content</a>')}
        );
    }
}
