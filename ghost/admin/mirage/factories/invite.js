import moment from 'moment';
import {Factory} from 'ember-cli-mirage';

export default Factory.extend({
    token(i) { return `${i}-token`; },
    email(i) { return `invited-user-${i}@example.com`; },
    expires() { return moment.utc().add(1, 'day').valueOf(); },
    createdAt() { return moment.utc().format(); },
    createdBy() { return 1; },
    updatedAt() { return moment.utc().format(); },
    updatedBy() { return 1; },
    status() { return 'sent'; },
    roleId() { return 1; }
});
