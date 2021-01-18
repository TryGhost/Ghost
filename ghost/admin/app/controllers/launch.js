import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class LaunchController extends Controller {
    @service router;

    @action
    close() {
        this.router.transitionTo('dashboard');
    }
}
