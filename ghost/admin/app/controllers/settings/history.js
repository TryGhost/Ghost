import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class HistoryController extends Controller {
    @service router;
    @service settings;
    @service store;

    queryParams = ['excludedEvents', 'excludedResources', 'user'];

    @tracked excludedEvents = null;
    @tracked excludedResources = null;
    @tracked user = null;

    get fullExcludedEvents() {
        return (this.excludedEvents || '').split(',');
    }

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
    changeExcludedItems({excludedEvents, excludedResources} = {}) {
        this.router.transitionTo({queryParams: {excludedEvents, excludedResources}});
    }

    @action
    changeUser(user) {
        this.router.transitionTo({queryParams: {user: user?.id}});
    }
}
