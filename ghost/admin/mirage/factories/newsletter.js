import moment from 'moment-timezone';
import {Factory} from 'miragejs';

export default Factory.extend({
    name(i) { return `Newsletter ${i}`; },
    slug(i) { return `newsletter-${i}`; },
    status() { return 'active'; },
    createdAt() { return moment.utc().toISOString(); },
    updatedAt() { return moment.utc().toISOString(); }
});
