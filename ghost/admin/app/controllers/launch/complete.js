import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class LaunchCompleteController extends Controller {
    @service router;

    @action
    finish() {
        this.router.transitionTo('dashboard');
    }

    @action
    goBack() {
        this.router.transitionTo('launch.set-pricing');
    }
}
