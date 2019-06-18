import Controller from '@ember/controller';
import {inject as service} from '@ember/service';

/* eslint-disable ghost/ember/alias-model-in-controller */
export default Controller.extend({
    ui: service()
});
