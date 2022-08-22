import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class AuditLogController extends Controller {
    @service router;
    @service settings;
    @service store;

    queryParams = ['excludedResources', 'user'];

    @tracked excludedResources = null;
    @tracked user = null;

    get fullExcludedResources() {
        return (this.excludedResources || '').split(',');
    }

    get userRecord() {
        if (!this.user) {
            return null;
        }

        // TODO: {reload: true} here shouldn't be needed but without it
        // the template renders nothing if the record is already in the store
        return this.store.findRecord('user', this.user, {reload: true});
    }

    @action
    changeExcludedResources(newList) {
        this.router.transitionTo({queryParams: {excludedResources: newList}});
    }

    @action
    changeUser(user) {
        this.router.transitionTo({queryParams: {user: user?.id}});
    }
}
