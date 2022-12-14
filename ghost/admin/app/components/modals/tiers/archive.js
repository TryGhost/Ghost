import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class ArchiveTierModal extends Component {
    @service notifications;
    @service router;

    get isActive() {
        const {tier} = this.args.data;
        return !!tier.active;
    }

    @task({drop: true})
    *archiveTierTask() {
        const {tier, onArchive} = this.args.data;
        tier.active = false;
        tier.visibility = 'none';

        try {
            yield tier.save();
            onArchive?.();
            return tier;
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error, {key: 'tier.archive.failed'});
            }
        } finally {
            this.args.close();
        }
    }
}
