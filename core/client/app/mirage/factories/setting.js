/* jscs:disable */
import Mirage from 'ember-cli-mirage';

export default Mirage.Factory.extend({
    uuid(i) { return `setting-${i}`; },
    key(i) { return `setting-${i}`; },
    value() { return null; },
    type() { return 'blog'; },
    created_at() { return '2015-01-12T18:29:01.000Z'; },
    created_by() { return 1; },
    updated_at() { return '2015-10-27T17:39:58.288Z'; },
    updated_by() { return 1; }
});
