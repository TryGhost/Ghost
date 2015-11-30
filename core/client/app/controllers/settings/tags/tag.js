import Ember from 'ember';

const {Controller, computed, inject} = Ember;
const {alias} = computed;

export default Controller.extend({

    tag: alias('model'),
    isMobile: alias('tagsController.isMobile'),

    tagsController: inject.controller('settings.tags'),
    notifications: inject.service(),

    saveTagProperty(propKey, newValue) {
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

    actions: {
        setProperty(propKey, value) {
            this.saveTagProperty(propKey, value);
        }
    }
});
