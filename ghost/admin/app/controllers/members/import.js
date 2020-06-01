import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as controller} from '@ember/controller';
import {inject as service} from '@ember/service';

export default class ImportController extends Controller {
    @service router;
    @controller members;

    @action
    refreshMembers() {
        this.members.refreshData();
    }

    @action
    close() {
        this.router.transitionTo('members');
    }
}
