import moment from 'moment-timezone';
import {Factory} from 'miragejs';

export default Factory.extend({
    token(i) { return `${i}-token`; },
    email(i) { return `invited-user-${i}@example.com`; },
    expires() { return moment.utc().add(1, 'day').valueOf(); },
    createdAt() { return moment.utc().format(); },
    updatedAt() { return moment.utc().format(); },
    status() { return 'sent'; }
});
