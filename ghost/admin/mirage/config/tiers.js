import {paginatedResponse} from '../utils';

export default function mockTiers(server) {
    server.post('/tiers/');

    server.get('/tiers/', paginatedResponse('tiers'));

    server.get('/tiers/:id/', function ({tiers}, {params}) {
        let {id} = params;
        let tier = tiers.find(id);

        return tier || new Response(404, {}, {
            errors: [{
                type: 'NotFoundError',
                message: 'Tier not found.'
            }]
        });
    });

    server.put('/tiers/:id/', function ({tiers}, {params}) {
        const attrs = this.normalizedRequestAttrs();
        const tier = tiers.find(params.id);

        tier.update(attrs);

        return tier.save();
    });

    server.del('/tiers/:id/');
}
