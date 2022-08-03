import moment from 'moment';
import {Factory} from 'miragejs';

export default Factory.extend({
    type: 'content',
    secret() {
        if (this.integration) {
            return `${this.integration.slug}_${this.type}_key-12345`;
        }
        return `${this.type}_key-12345`;
    },
    lastSeenAt() {
        return moment.utc().format();
    },

    createdAt() { return moment.utc().format(); },
    createdBy: 1,
    updatedAt() { return moment.utc().format(); },
    updatedBy: 1
});
