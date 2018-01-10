import Controller from '@ember/controller';
import {computed} from '@ember/object';
import {readOnly} from '@ember/object/computed';
import {inject as service} from '@ember/service';

export default Controller.extend({
    upgradeStatus: service(),

    about: readOnly('model'),

    copyrightYear: computed(function () {
        let date = new Date();
        return date.getFullYear();
    })
});
