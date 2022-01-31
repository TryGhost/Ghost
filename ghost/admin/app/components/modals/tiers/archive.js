import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';

export default class ArchiveTierModalComponent extends Component {
    @service notifications;
    @service router;

    get isActive() {
        const {product} = this.args.data;
        return !!product.active;
    }

    @task({drop: true})
    *archiveTierTask() {
        const {product} = this.args.data;
        product.active = false;

        try {
            yield product.save();

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
