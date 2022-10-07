import Controller from '@ember/controller';
import DeleteTagModal from '../components/tags/delete-tag-modal';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class TagController extends Controller {
    @service modals;
    @service notifications;
    @service router;

    get tag() {
        return this.model;
    }

    @action
    confirmDeleteTag() {
        return this.modals.open(DeleteTagModal, {
            tag: this.model
        });
    }

    @task({drop: true})
    *saveTask() {
        let {tag} = this;

        try {
            if (tag.get('errors').length !== 0) {
                return;
            }
            yield tag.save();

            // replace 'new' route with 'tag' route
            this.replaceRoute('tag', tag);

            return tag;
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error, {key: 'tag.save'});
            }
        }
    }
}
