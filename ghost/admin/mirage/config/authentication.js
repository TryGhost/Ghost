/* eslint-disable camelcase */
import {Response} from 'miragejs';
import {dasherize} from '@ember/string';
import {isBlank} from '@ember/utils';

export default function mockAuthentication(server) {
    // Password sign-in
    server.post('/session', function () {
        return new Response(201);
    });

    // 2fa code verification
    server.put('/session/verify', function () {
        return new Response(201);
    });

    // 2fa code re-send
    server.post('/session/verify', function () {
        return new Response(200);
    });

    server.post('/authentication/password_reset', function (schema, request) {
        let {password_reset} = JSON.parse(request.requestBody);
        let email = password_reset[0].email;

        if (email === 'unknown@example.com') {
            return new Response(404, {}, {
                errors: [
                    {
                        message: 'There is no user with that email address.',
                        type: 'NotFoundError'
                    }
                ]
            });
        } else {
            return {
                password_reset: [
                    {message: 'Check your email for further instructions.'}
                ]
            };
        }
    });

    server.get('/authentication/invitation/', function (schema, request) {
        let {email} = request.queryParams;
        let invite = schema.invites.findBy({email});
        let valid = !!invite;

        return {
            invitation: [{
                valid
            }]
        };
    });

    /* Setup ---------------------------------------------------------------- */

    server.post('/authentication/setup', function ({roles, users}, request) {
        let attrs = JSON.parse(request.requestBody).setup;
        let role = roles.findBy({name: 'Owner'});

        // create owner role unless already exists
        if (!role) {
            role = roles.create({name: 'Owner'});
        }
        attrs.roles = [role];

        if (!isBlank(attrs.email)) {
            attrs.slug = dasherize(attrs.email.split('@')[0]);
        }

        // NOTE: server does not use the user factory to fill in blank fields
        return users.create(attrs);
    });

    server.get('/authentication/setup/', function () {
        return {
            setup: [
                {status: true}
            ]
        };
    });
}
