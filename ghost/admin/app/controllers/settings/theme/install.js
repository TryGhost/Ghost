import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class InstallThemeController extends Controller {
    @service router;

    queryParams = ['source', 'ref'];

    @tracked source = '';
    @tracked ref = '';

    @action
    close() {
        this.router.transitionTo('settings.theme');
    }
}
