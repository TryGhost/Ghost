import Controller, {inject as controller} from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ImportController extends Controller {
    @service router;
    @controller labs;

    @action
    close() {
        this.router.transitionTo('labs');
    }
}
