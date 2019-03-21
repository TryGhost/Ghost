import Controller from '@ember/controller';
import {alias} from '@ember/object/computed';

export default Controller.extend({
    guid: alias('model')
});
