import Controller from '@ember/controller';
import DeleteCollectionModal from '../components/collections/delete-collection-modal';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class CollectionController extends Controller {
    @service modals;
    @service notifications;
    @service router;

    get collection() {
        return this.model;
    }

    @action
    confirmDeleteCollection() {
        return this.modals.open(DeleteCollectionModal, {
            collection: this.model
        });
    }

    @task({drop: true})
    *saveTask() {
        let {collection} = this;

        try {
            if (collection.get('errors').length !== 0) {
                return;
            }
            yield collection.save();

            // replace 'new' route with 'collection' route
            this.replaceRoute('collection', collection);

            return collection;
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error, {key: 'collection.save'});
            }
        }
    }
}
