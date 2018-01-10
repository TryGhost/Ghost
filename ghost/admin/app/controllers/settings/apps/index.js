/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import {inject as service} from '@ember/service';

export default Controller.extend({
    settings: service()
});
