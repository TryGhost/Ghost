import moment from 'moment';
import {Response} from 'miragejs';
import {paginatedResponse} from '../utils';

export default function mockIntegrations(server) {
    server.get('/integrations/', paginatedResponse('integrations'));

    server.post('/integrations/', function ({integrations}, {requestBody}) {
        let body = JSON.parse(requestBody);
        let [params] = body.integrations;

        // all integrations created via the API have a type of 'custom'
        params.type = 'custom';

        if (!params.name) {
            return new Response(422, {}, {errors: [{
                type: 'ValidationError',
                message: 'Name is required',
                property: 'name'
            }]});
        }

        if (integrations.findBy({name: params.name}) || params.name.match(/Duplicate/i)) {
            return new Response(422, {}, {errors: [{
                type: 'ValidationError',
                message: 'Name has already been used',
                property: 'name'
            }]});
        }

        // allow factory to create defaults
        if (!params.slug) {
            delete params.slug;
        }

        // use factory creation to auto-create api keys
        return server.create('integration', params);
    });

    server.put('/integrations/:id/', function (schema, {params}) {
        let {integrations, apiKeys, webhooks} = schema;
        let attrs = this.normalizedRequestAttrs();
        let integration = integrations.find(params.id);
        let _apiKeys = [];
        let _webhooks = [];

        // this is required to work around an issue with ember-cli-mirage and
        // embedded records. The `attrs` object will contain POJOs of the
        // embedded apiKeys and webhooks but mirage expects schema model
        // objects for relations so we need to fetch model records and replace
        // the relationship keys
        attrs.apiKeys.forEach((apiKey) => {
            _apiKeys.push(apiKeys.find(apiKey.id));
        });
        attrs.webhooks.forEach((webhook) => {
            _webhooks.push(webhooks.find(webhook.id));
        });
        attrs.apiKeys = _apiKeys;
        attrs.webhooks = _webhooks;

        attrs.updatedAt = moment.utc().format();

        return integration.update(attrs);
    });

    server.del('/integrations/:id/');
}
