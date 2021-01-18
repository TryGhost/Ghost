import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class LaunchSetPricingController extends Controller {
    @service router;

    @action
    goToNext() {
        this.router.transitionTo('launch.complete');
    }

    @action
    goBack() {
        this.router.transitionTo('launch.connect-stripe');
    }
}
