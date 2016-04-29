import Ember from 'ember';

const {
    computed,
    inject: {controller}
} = Ember;

const {alias} = computed;

export default Ember.Controller.extend({
    appsController: controller('settings.apps'),

    slack: alias('appsController.model.slack.firstObject')
});
