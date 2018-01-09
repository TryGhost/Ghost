import Controller from '@ember/controller';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Controller.extend({
    upgradeStatus: service(),

    copyrightYear: computed(function () {
        let date = new Date();
        return date.getFullYear();
    })
});
