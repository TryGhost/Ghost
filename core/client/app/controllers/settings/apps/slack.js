import Ember from 'ember';
import SettingsSaveMixin from 'ghost/mixins/settings-save';

const {
    Controller,
    computed,
    inject: {controller}
} = Ember;
const {alias} = computed;

export default Controller.extend(SettingsSaveMixin, {
    appsController: controller('settings.apps'),
    slack: alias('appsController.model.slack'),

    newSlackObject: computed('slack', 'model', function() {
        let slack = this.get('slack');
        let newSlack = this.get('model');
        let slackItem;

        try {
            [ slackItem ] = JSON.parse(slack) || {};
        } catch (e) {
            slackItem = {};
        }

        newSlack.set('url', slackItem.url);
        newSlack.set('channel', slackItem.channel);
        newSlack.set('name', slackItem.name);
        newSlack.set('isActive', slackItem.isActive);

        return newSlack;
    }),

    actions: {
        updateProperty(propKey, newValue) {
            let newSlackObject = this.get('newSlackObject');
            let currentValue = newSlackObject.get(propKey);
            newValue = newValue.trim();

            if (!newValue) {
                return;
            }

            if (newValue === currentValue) {
                return;
            }
            if (!this.get('validateProperty', propKey, newValue)) {
                return;
            } else {
                newSlackObject.set(propKey, newValue);
            }
        },

        validateProperty(propKey, val) {
            if (!propKey && !val) {
                return;
            }
        },

        toggleActiveProperty() {
            if (this.get('newSlackObject.isActive')) {
                this.set('newSlackObject.isActive', false);
                this.get('appsController').send('save');
            } else {
                this.set('newSlackObject.isActive', true);
                this.get('appsController').send('save');
            }
        }
    }
});
