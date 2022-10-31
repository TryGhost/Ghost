import moment from 'moment-timezone';
import {Response} from 'miragejs';
import {paginatedResponse} from '../utils';

export default function mockInvites(server) {
    server.get('/invites/', paginatedResponse('invites'));

    server.get('/invites/:id', function (schema, request) {
        let {id} = request.params;
        let invite = schema.invites.find(id);

        return invite || new Response(404, {}, {
            errors: [{
                type: 'NotFoundError',
                message: 'Invite not found.'
            }]
        });
    });

    server.post('/invites/', function ({invites}) {
        let attrs = this.normalizedRequestAttrs();
        let oldInvite = invites.findBy({email: attrs.email});

        if (oldInvite) {
            oldInvite.destroy();
        }

        /* eslint-disable camelcase */
        attrs.token = `${invites.all().models.length}-token`;
        attrs.expires = moment.utc().add(1, 'day').valueOf();
        attrs.createdAt = moment.utc().format();
        attrs.createdBy = 1;
        attrs.updatedAt = moment.utc().format();
        attrs.updatedBy = 1;
        attrs.status = 'sent';
        /* eslint-enable camelcase */

        return invites.create(attrs);
    });

    server.del('/invites/:id/');
}
