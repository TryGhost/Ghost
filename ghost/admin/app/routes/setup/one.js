import Ember from 'ember';
import Route from 'ember-route';
import injectService from 'ember-service/inject';
import EmberObject from 'ember-object';
import run from 'ember-runloop';

import AjaxService from 'ember-ajax/services/ajax';

// ember-cli-shims doesn't export Ember.testing
const {testing} = Ember;

let DownloadCountPoller = EmberObject.extend({
    url: null,
    count: '',
    runId: null,

    ajax: AjaxService.create(),
    notifications: injectService(),

    init() {
        this._super(...arguments);
        this.downloadCounter();
        this.poll();
    },

    poll() {
        let interval = testing ? 20 : 2000;
        let runId = run.later(this, function () {
            this.downloadCounter();
            if (!testing) {
                this.poll();
            }
        }, interval);

        this.set('runId', runId);
    },

    downloadCounter() {
        this.get('ajax').request(this.get('url')).then((data) => {
            let pattern = /(-?\d+)(\d{3})/;
            let count = data.count.toString();

            while (pattern.test(count)) {
                count = count.replace(pattern, '$1,$2');
            }

            this.set('count', count);
        }).catch((error) => {
            this.set('count', '');
            this.get('notifications').showAPIError(error);
        });
    }
});

export default Route.extend({
    ghostPaths: injectService(),

    model() {
        return DownloadCountPoller.create({url: this.get('ghostPaths.count')});
    },

    resetController(controller, isExiting) {
        if (isExiting) {
            run.cancel(controller.get('model.runId'));
            controller.set('model', null);
        }
    }
});
