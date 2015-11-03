/* jscs:disable */
import Mirage from 'ember-cli-mirage';

export default Mirage.Factory.extend({
    created_at() { return '2013-11-25T14:48:11.000Z'; },
    created_by() { return 1; },
    description(i) { return `Role ${i}`; },
    name() { return ''; },
    updated_at() { return '2013-11-25T14:48:11.000Z'; },
    updated_by() { return 1; },
    uuid(i) { return `role-${i}`; }
});
