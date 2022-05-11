import Component from '@glimmer/component';
import {htmlSafe} from '@ember/template';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

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

    async saveTier() {
        const data = this.args.getData();
        this.tier = data?.tier;
        if (this.tier) {
            const monthlyAmount = Math.round(data.monthlyAmount * 100);
            const yearlyAmount = Math.round(data.yearlyAmount * 100);
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
            this.tier.set('monthlyPrice', monthlyPrice);
            this.tier.set('yearlyPrice', yearlyPrice);
            const savedTier = await this.tier.save();
            return savedTier;
        }
    }

    @task
    *finaliseTask() {
        const data = this.args.getData();
        if (data?.tier) {
            yield this.saveTier();
            this.settings.set('editorIsLaunchComplete', true);
            yield this.settings.save();
        }
        this.router.transitionTo('dashboard');
        this.notifications.showNotification(
            'Launch complete!',
            {type: 'success', actions: htmlSafe('<a href="#/posts">Start creating content</a>')}
        );
    }
}
