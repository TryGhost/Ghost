import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as controller} from '@ember/controller';
import {inject as service} from '@ember/service';

export default class ImportController extends Controller {
    @controller members;
    @service router;

    @action
    fetchNewMembers() {
        this.members.fetchMembersTask.perform();
    }

    @action
    close() {
        this.router.transitionTo('members');
    }
}
