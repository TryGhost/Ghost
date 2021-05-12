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
        // clear any unsaved settings changes when going back/forward/closing
        this.settings.rollbackAttributes();
    }

    @task
    *finaliseTask() {
        const data = this.args.getData();
        if (data && data.product) {
            const updatedProduct = yield data.product.save();
            const monthlyPrice = updatedProduct.get('stripePrices').find(d => d.nickname === 'Monthly');
            const yearlyPrice = updatedProduct.get('stripePrices').find(d => d.nickname === 'Yearly');
            const portalPlans = this.settings.get('portalPlans') || [];
            let allowedPlans = [...portalPlans];
            if (data.isMonthlyChecked && monthlyPrice) {
                allowedPlans.push(monthlyPrice.id);
            }

            if (data.isYearlyChecked && yearlyPrice) {
                allowedPlans.push(yearlyPrice.id);
            }
            this.settings.set('portalPlans', allowedPlans);
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
