import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as controller} from '@ember/controller';
import {resetQueryParams} from 'ghost-admin/helpers/reset-query-params';
import {inject as service} from '@ember/service';

export default class ImportController extends Controller {
    @service router;
    @controller members;

    @action
    refreshMembers({label} = {}) {
        if (label) {
            let queryParams = Object.assign(resetQueryParams('members.index'), {label: label.slug});
            this.router.transitionTo({queryParams});
        }
        this.members.refreshData();
    }

    @action
    close() {
        this.router.transitionTo('members');
    }
}
