import moment from 'moment-timezone';
import {Factory} from 'miragejs';

export default Factory.extend({
    name(i) { return `Integration ${i + 1}`;},
    slug() { return this.name.toLowerCase().replace(' ', '-'); },
    description: null,
    iconImage: null,
    type: 'custom',

    createdAt() { return moment.utc().format(); },
    updatedAt() { return moment.utc().format(); },

    afterCreate(integration, server) {
        const contentKey = server.create('api-key', {type: 'content', integration});
        const adminKey = server.create('api-key', {type: 'admin', integration});

        integration.apiKeyIds = [contentKey.id, adminKey.id];
        integration.save();
    }
});
