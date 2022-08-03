import ApplicationAdapter from 'ghost-admin/adapters/application';
import classic from 'ember-classic-decorator';

@classic
export default class Page extends ApplicationAdapter {
    // posts and pages now include everything by default
    buildIncludeURL(store, modelName, id, snapshot, requestType, query) {
        return this.buildURL(modelName, id, snapshot, requestType, query);
    }

    buildQuery(store, modelName, options) {
        return options;
    }
}
