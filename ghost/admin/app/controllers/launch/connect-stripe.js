import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class LaunchConnectStripeController extends Controller {
    @service router;

    @action
    goToNext() {
        this.router.transitionTo('launch.set-pricing');
    }

    @action
    goBack() {
        this.router.transitionTo('launch.customise-design');
    }
}
