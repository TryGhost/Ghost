import Controller from 'ember-controller';
import injectController from 'ember-controller/inject';
import {alias} from 'ember-computed';

export default Controller.extend({
    appsController: injectController('settings.apps'),

    slack: alias('appsController.model.slack.firstObject')
});
