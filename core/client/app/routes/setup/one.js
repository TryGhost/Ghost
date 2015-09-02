import Ember from 'ember';
import {request as ajax} from 'ic-ajax';

var DownloadCountPoller = Ember.Object.extend({
    url: null,
    count: '',
    runId: null,

    init: function () {
        this.downloadCounter();
        this.poll();
    },

    poll: function () {
        var interval = 2000,
            runId;

        runId = Ember.run.later(this, function () {
            this.downloadCounter();
            this.poll();
        }, interval);

        this.set('runId', runId);
    },

    downloadCounter: function () {
        var self = this;

        ajax(this.get('url')).then(function (data) {
            var count = data.count.toString(),
                pattern = /(-?\d+)(\d{3})/;

            while (pattern.test(count)) {
                count = count.replace(pattern, '$1,$2');
            }

            self.set('count', count);
        }).catch(function () {
            self.set('count', '');
        });
    }
});

export default Ember.Route.extend({
    ghostPaths: Ember.inject.service('ghost-paths'),

    model: function () {
        return DownloadCountPoller.create({url: this.get('ghostPaths.count')});
    },

    resetController: function (controller, isExiting) {
        if (isExiting) {
            Ember.run.cancel(controller.get('model.runId'));
            controller.set('model', null);
        }
    }
});
