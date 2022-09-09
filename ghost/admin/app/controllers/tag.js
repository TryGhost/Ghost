import Controller from '@ember/controller';
import DeleteTagModal from '../components/tags/delete-tag-modal';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class TagController extends Controller {
    @service modals;
    @service notifications;
    @service router;

    @tracked showUnsavedChangesModal;

    get tag() {
        return this.model;
    }

    @action
    confirmDeleteTag() {
        return this.modals.open(DeleteTagModal, {
            tag: this.model
        });
    }

    @action
    toggleUnsavedChangesModal(transition) {
        let leaveTransition = this.leaveScreenTransition;

        if (!transition && this.showUnsavedChangesModal) {
            this.leaveScreenTransition = null;
            this.showUnsavedChangesModal = false;
            return;
        }

        if (!leaveTransition || transition.targetName === leaveTransition.targetName) {
            this.leaveScreenTransition = transition;

            // if a save is running, wait for it to finish then transition
            if (this.saveTask.isRunning) {
                return this.saveTask.last.then(() => {
                    transition.retry();
                });
            }

            // we genuinely have unsaved data, show the modal
            this.showUnsavedChangesModal = true;
        }
    }

    @action
    leaveScreen() {
        this.tag.rollbackAttributes();
        return this.leaveScreenTransition.retry();
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
