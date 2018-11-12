import {Response} from 'ember-cli-mirage';
import {isEmpty} from '@ember/utils';
import {paginatedResponse} from '../utils';

export default function mockWebhooks(server) {
    server.get('/webhooks/', paginatedResponse('webhooks'));

    server.post('/webhooks/', function ({webhooks}) {
        let attrs = this.normalizedRequestAttrs();
        let errors = [];

        if (!attrs.name) {
            errors.push({
                errorType: 'ValidationError',
                message: 'Name is required',
                property: 'name'
            });
        }

        if (!attrs.event) {
            errors.push({
                errorType: 'ValidationError',
                message: 'Event is required',
                property: 'event'
            });
        }

        if (!attrs.targetUrl) {
            errors.push({
                errorType: 'ValidationError',
                message: 'Target URL is required',
                property: 'target_url'
            });
        }

        if (attrs.name && (webhooks.findBy({name: attrs.name, integrationId: attrs.integrationId}) || attrs.name.match(/Duplicate/i))) {
            errors.push({
                errorType: 'ValidationError',
                message: 'Name has already been used',
                property: 'name'
            });
        }

        // TODO: check server-side validation
        if (webhooks.findBy({targetUrl: attrs.targetUrl, event: attrs.event})) {
            errors.push({
                errorType: 'ValidationError',
                message: 'Target URL has already been used for this event',
                property: 'target_url'
            });
        }

        if (!isEmpty(errors)) {
            return new Response(422, {}, {errors});
        }

        return webhooks.create(attrs);
    });

    server.put('/webhooks/:id/');
    server.del('/webhooks/:id/');
}
