import Ember from 'ember';

const {
    computed,
    inject: {controller},
    Controller
} = Ember;
const {alias} = computed;

export default Controller.extend({
    appsController: controller('settings.apps'),

    slack: alias('appsController.model.slack.firstObject')
});
