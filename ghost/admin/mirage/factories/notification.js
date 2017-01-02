import {Factory} from 'ember-cli-mirage';

export default Factory.extend({
    dismissible: true,
    message: 'This is an alert',
    status: 'alert',
    type: 'error'
});
