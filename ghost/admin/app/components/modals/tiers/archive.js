import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class ArchiveTierModal extends Component {
    @service notifications;
    @service router;

    get isActive() {
        const {product} = this.args.data;
        return !!product.active;
    }

    @task({drop: true})
    *archiveTierTask() {
        const {product, onArchive} = this.args.data;
        product.active = false;
        product.visibility = 'none';

        try {
            yield product.save();
            onArchive?.();
            return product;
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error, {key: 'tier.archive.failed'});
            }
        } finally {
            this.args.close();
        }
    }
}
