import Mirage from 'ember-cli-mirage';
import {paginatedResponse} from '../utils';

export default function mockInvites(server) {
    server.get('/invites/', function (db, request) {
        let response = paginatedResponse('invites', db.invites, request);
        return response;
    });

    server.get('/invites/:id', function (db, request) {
        let {id} = request.params;
        let invite = db.invites.find(id);

        if (!invite) {
            return new Mirage.Response(404, {}, {
                errors: [{
                    errorType: 'NotFoundError',
                    message: 'Invite not found.'
                }]
            });
        } else {
            return {invites: [invite]};
        }
    });

    server.post('/invites/', function (db, request) {
        let [attrs] = JSON.parse(request.requestBody).invites;
        let [oldInvite] = db.invites.where({email: attrs.email});

        if (oldInvite) {
            // resend - server deletes old invite and creates a new one with new ID
            attrs.id = db.invites[db.invites.length - 1].id + 1;
            db.invites.remove(oldInvite.id);
        }

        /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
        attrs.token = `${db.invites.length}-token`;
        attrs.expires = moment.utc().add(1, 'day').unix();
        attrs.created_at = moment.utc().format();
        attrs.created_by = 1;
        attrs.updated_at = moment.utc().format();
        attrs.updated_by = 1;
        attrs.status = 'sent';
        /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */

        let invite = db.invites.insert(attrs);

        return {
            invites: [invite]
        };
    });

    server.del('/invites/:id/', function (db, request) {
        db.invites.remove(request.params.id);

        return new Mirage.Response(204, {}, {});
    });
}
