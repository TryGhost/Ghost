import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class ArchiveOfferModal extends Component {
    @service notifications;
    @service router;

    get isActive() {
        const {offer} = this.args.data;
        return offer.status === 'active';
    }

    @task({drop: true})
    *archiveOfferTask() {
        const {offer} = this.args.data;
        offer.status = 'archived';

        try {
            yield offer.save();
            this.router.transitionTo('offers', {queryParams: {
                type: 'archived'
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
