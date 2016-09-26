/* jscs:disable */
import Mirage from 'ember-cli-mirage';

export default Mirage.Factory.extend({
    token(i) { return `${i}-token`; },
    email(i) { return `invited-user-${i}@example.com`; },
    expires() { return moment.utc().add(1, 'day').unix(); },
    created_at() { return moment.utc().format(); },
    created_by() { return 1; },
    updated_at() { return moment.utc().format(); },
    updated_by() { return 1; },
    status() { return 'sent'; },
    roles() { return []; }
});
