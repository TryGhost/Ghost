/* jscs:disable */
import Mirage from 'ember-cli-mirage';

export default Mirage.Factory.extend({
    dismissible: true,
    message: 'This is an alert',
    status: 'alert',
    type: 'error'
});
