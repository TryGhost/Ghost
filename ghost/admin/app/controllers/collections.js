import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class CollectionsController extends Controller {
    @service router;

    queryParams = ['type'];
    @tracked type = 'public';

    get collections() {
        return this.model;
    }

    get filteredCollections() {
        return this.collections.filter((collection) => {
            return (!collection.isNew);
        });
    }

    get sortedCollections() {
        return this.filteredCollections.sort((collectionA, collectionB) => {
            // ignorePunctuation means the # in internal collection names is ignored
            return collectionA.title.localeCompare(collectionB.title, undefined, {ignorePunctuation: true});
        });
    }

    @action
    changeType(type) {
        this.type = type;
    }

    @action
    newCollection() {
        this.router.transitionTo('collection.new');
    }
}
