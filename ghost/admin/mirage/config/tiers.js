import {paginatedResponse, withPermissionsCheck} from '../utils';

const ALLOWED_WRITE_ROLES = [
    'Owner',
    'Administrator'
];
const ALLOWED_READ_ROLES = [
    'Owner',
    'Administrator',
    'Editor',
    'Author',
    'Super Editor'
];

export default function mockTiers(server) {
    // CREATE
    server.post('/tiers/', withPermissionsCheck(ALLOWED_WRITE_ROLES, function ({tiers}) {
        const attrs = this.normalizedRequestAttrs();
        return tiers.create(attrs);
    }));

    // READ
    server.get('/tiers/', withPermissionsCheck(ALLOWED_READ_ROLES, paginatedResponse('tiers')));

    server.get('/tiers/:id/', withPermissionsCheck(ALLOWED_READ_ROLES, function ({tiers}, {params}) {
        let {id} = params;
        let tier = tiers.find(id);

        return tier || new Response(404, {}, {
            errors: [{
                type: 'NotFoundError',
                message: 'Tier not found.'
            }]
        });
    }));

    // UPDATE
    server.put('/tiers/:id/', withPermissionsCheck(ALLOWED_WRITE_ROLES, function ({tiers}, {params}) {
        const attrs = this.normalizedRequestAttrs();
        const tier = tiers.find(params.id);

        tier.update(attrs);

        return tier.save();
    }));

    // DELETE
    server.del('/tiers/:id/', withPermissionsCheck(ALLOWED_WRITE_ROLES, function (schema, request) {
        const id = request.params.id;
        schema.tiers.find(id).destroy();
    }));
}
