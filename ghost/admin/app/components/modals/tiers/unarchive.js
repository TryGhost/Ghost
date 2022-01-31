import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';

export default class UnarchiveTierModalComponent extends Component {
    @service notifications;
    @service router;

    get isActive() {
        const {product} = this.args.data;
        return !!product.active;
    }

    @task({drop: true})
    *unarchiveTask() {
        const {product} = this.args.data;
        product.active = true;

        try {
            yield product.save();

            return product;
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error, {key: 'tier.unarchive.failed'});
            }
        } finally {
            this.args.close();
        }
    }
}
