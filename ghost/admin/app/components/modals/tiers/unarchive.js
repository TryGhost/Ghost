import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class UnarchiveTierModal extends Component {
    @service notifications;
    @service router;

    get isActive() {
        const {tier} = this.args.data;
        return !!tier.active;
    }

    @task({drop: true})
    *unarchiveTask() {
        const {tier, onUnarchive} = this.args.data;
        tier.active = true;

        try {
            yield tier.save();
            onUnarchive?.();
            return tier;
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error, {key: 'tier.unarchive.failed'});
            }
        } finally {
            this.args.close();
        }
    }
}
