import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class UnarchiveOfferModal extends Component {
    @service notifications;
    @service router;

    get isActive() {
        const {offer} = this.args.data;
        return offer.status === 'active';
    }

    @task({drop: true})
    *unarchiveOfferTask() {
        const {offer} = this.args.data;
        offer.status = 'active';

        try {
            yield offer.save();
            this.router.transitionTo('offers', {queryParams: {
                type: 'active'
            }});

            return offer;
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error, {key: 'offer.save.failed'});
            }
        } finally {
            this.args.close();
        }
    }
}
