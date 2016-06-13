import Ember from 'ember';
import AjaxService from 'ember-ajax/services/ajax';

const {
    Route,
    inject: {service},
    Object: EmberObject,
    testing,
    run
} = Ember;

let DownloadCountPoller = EmberObject.extend({
    url: null,
    count: '',
    runId: null,

    ajax: AjaxService.create(),

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
        }).catch(() => {
            this.set('count', '');
        });
    }
});

export default Route.extend({
    ghostPaths: service('ghost-paths'),

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
