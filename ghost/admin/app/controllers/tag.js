import Controller from '@ember/controller';
import EmberObject, {action, computed, defineProperty} from '@ember/object';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import classic from 'ember-classic-decorator';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {slugify} from '@tryghost/string';
import {task} from 'ember-concurrency';

const SCRATCH_PROPS = ['name', 'slug', 'description', 'metaTitle', 'metaDescription', 'ogTitle', 'ogDescription', 'twitterTitle', 'twitterDescription', 'codeinjectionHead', 'codeinjectionFoot'];

@classic
export default class TagController extends Controller {
    @service notifications;
    @service router;

    showDeleteTagModal = false;

    @alias('model')
        tag;

    @computed('tag')
    get scratchTag() {
        let scratchTag = EmberObject.create({tag: this.tag});
        SCRATCH_PROPS.forEach(prop => defineProperty(scratchTag, prop, boundOneWay(`tag.${prop}`)));
        return scratchTag;
    }

    @action
    setProperty(propKey, value) {
        this._saveTagProperty(propKey, value);
    }

    @action
    openDeleteTagModal() {
        this.set('showDeleteTagModal', true);
    }

    @action
    closeDeleteTagModal() {
        this.set('showDeleteTagModal', false);
    }

    @action
    deleteTag() {
        return this.tag.destroyRecord().then(() => {
            this.set('showDeleteTagModal', false);
            return this.transitionToRoute('tags');
        }, (error) => {
            return this.notifications.showAPIError(error, {key: 'tag.delete'});
        });
    }

    @action
    save() {
        return this.saveTask.perform();
    }

    @action
    toggleUnsavedChangesModal(transition) {
        let leaveTransition = this.leaveScreenTransition;

        if (!transition && this.showUnsavedChangesModal) {
            this.set('leaveScreenTransition', null);
            this.set('showUnsavedChangesModal', false);
            return;
        }

        if (!leaveTransition || transition.targetName === leaveTransition.targetName) {
            this.set('leaveScreenTransition', transition);

            // if a save is running, wait for it to finish then transition
            if (this.saveTask.isRunning) {
                return this.saveTask.last.then(() => {
                    transition.retry();
                });
            }

            // we genuinely have unsaved data, show the modal
            this.set('showUnsavedChangesModal', true);
        }
    }

    @action
    leaveScreen() {
        this.tag.rollbackAttributes();
        return this.leaveScreenTransition.retry();
    }

    @(task(function* () {
        let {tag, scratchTag} = this;

        // if Cmd+S is pressed before the field loses focus make sure we're
        // saving the intended property values
        let scratchProps = scratchTag.getProperties(SCRATCH_PROPS);
        tag.setProperties(scratchProps);

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
    }).drop())
        saveTask;

    @task(function* (slug) {
        this.set('isLoading', true);

        yield this.store.queryRecord('tag', {slug}).then((tag) => {
            this.set('tag', tag);
            this.set('isLoading', false);
            return tag;
        });
    })
        fetchTag;

    _saveTagProperty(propKey, newValue) {
        let tag = this.tag;
        let currentValue = tag.get(propKey);

        if (newValue) {
            newValue = newValue.trim();
        }

        // avoid modifying empty values and triggering inadvertant unsaved changes modals
        if (newValue !== false && !newValue && !currentValue) {
            return;
        }

        // Quit if there was no change
        if (newValue === currentValue) {
            return;
        }

        tag.set(propKey, newValue);

        // Generate slug based on name for new tag when empty
        if (propKey === 'name' && !tag.slug && tag.isNew) {
            let slugValue = slugify(newValue);
            if (/^#/.test(newValue)) {
                slugValue = 'hash-' + slugValue;
            }
            tag.set('slug', slugValue);
        }

        // TODO: This is required until .validate/.save mark fields as validated
        tag.get('hasValidated').addObject(propKey);
    }
}
