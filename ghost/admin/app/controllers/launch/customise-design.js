import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class LaunchCustomiseDesignController extends Controller {
    @service router;

    @action
    next() {
        this.router.transitionTo('launch.connect-stripe');
    }
}
