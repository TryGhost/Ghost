/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import config from 'ghost-admin/config/environment';

export default Controller.extend({
    isTesting: undefined,

    init() {
        this._super(...arguments);
        if (this.isTesting === undefined) {
            this.isTesting = config.environment === 'test';
        }
    }
});
