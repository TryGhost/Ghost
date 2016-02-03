import Ember from 'ember';

const {
    Controller,
    computed,
    inject: {service, controller}
} = Ember;
const {alias} = computed;

export default Controller.extend({

    showDeleteTagModal: false,

    tag: alias('model'),
    isMobile: alias('tagsController.isMobile'),

    applicationController: controller('application'),
    tagsController: controller('settings.tags'),
    notifications: service(),

    _saveTagProperty(propKey, newValue) {
        let tag = this.get('tag');
        let currentValue = tag.get(propKey);

        newValue = newValue.trim();

        // Quit if there was no change
        if (newValue === currentValue) {
            return;
        }

        tag.set(propKey, newValue);
        // TODO: This is required until .validate/.save mark fields as validated
        tag.get('hasValidated').addObject(propKey);

        tag.save().then((savedTag) => {
            // replace 'new' route with 'tag' route
            this.replaceRoute('settings.tags.tag', savedTag);
        }).catch((error) => {
            if (error) {
                this.get('notifications').showAPIError(error, {key: 'tag.save'});
            }
        });
    },

    _deleteTag() {
        let tag = this.get('tag');

        return tag.destroyRecord().then(() => {
            this._deleteTagSuccess();
        }, (error) => {
            this._deleteTagFailure(error);
        });
    },

    _deleteTagSuccess() {
        let currentRoute = this.get('applicationController.currentRouteName') || '';

        if (currentRoute.match(/^settings\.tags/)) {
            this.transitionToRoute('settings.tags.index');
        }
    },

    _deleteTagFailure(error) {
        this.get('notifications').showAPIError(error, {key: 'tag.delete'});
    },

    actions: {
        setProperty(propKey, value) {
            this._saveTagProperty(propKey, value);
        },

        toggleDeleteTagModal() {
            this.toggleProperty('showDeleteTagModal');
        },

        deleteTag() {
            return this._deleteTag();
        }
    }
});
