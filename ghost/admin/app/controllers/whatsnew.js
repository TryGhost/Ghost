import Controller from '@ember/controller';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

/* eslint-disable ghost/ember/alias-model-in-controller */
export default Controller.extend({
    config: service(),
    upgradeStatus: service(),
    whatsNew: service(),

    queryParams: ['entry'],

    copyrightYear: computed(function () {
        let date = new Date();
        return date.getFullYear();
    })
});
