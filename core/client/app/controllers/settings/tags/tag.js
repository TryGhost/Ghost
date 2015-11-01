import Ember from 'ember';

const {computed} = Ember,
      {alias} = computed;

export default Ember.Controller.extend({

    tag: alias('model'),

    saveTagProperty: function (propKey, newValue) {
        const tag = this.get('tag'),
              currentValue = tag.get(propKey);

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
            this.replaceWith('settings.tags.tag', savedTag);
        }).catch((error) => {
            if (error) {
                this.notifications.showAPIError(error, {key: 'tag.save'});
            }
        });
    },

    actions: {
        setProperty: function (propKey, value) {
            this.saveTagProperty(propKey, value);
        }
    }
});
