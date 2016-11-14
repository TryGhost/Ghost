/* eslint-disable camelcase */
import Mirage from 'ember-cli-mirage';
import {isBlank} from 'ember-utils';
import $ from 'jquery';

export default function mockAuthentication(server) {
    server.post('/authentication/token', function (db, request) {
        let params = $.deparam(request.requestBody);

        if (params.grant_type === 'authorization_code') {
            // OAuth sign-in
            if (!db.users.length) {
                let [role] = db.roles.where({name: 'Owner'});
                server.create('user', {email: 'oauthtest@example.com', roles: [role]});
            }

            return {
                access_token: '5JhTdKI7PpoZv4ROsFoERc6wCHALKFH5jxozwOOAErmUzWrFNARuH1q01TYTKeZkPW7FmV5MJ2fU00pg9sm4jtH3Z1LjCf8D6nNqLYCfFb2YEKyuvG7zHj4jZqSYVodN2YTCkcHv6k8oJ54QXzNTLIDMlCevkOebm5OjxGiJpafMxncm043q9u1QhdU9eee3zouGRMVVp8zkKVoo5zlGMi3zvS2XDpx7xsfk8hKHpUgd7EDDQxmMueifWv7hv6n',
                expires_in: 3600,
                refresh_token: 'XP13eDjwV5mxOcrq1jkIY9idhdvN3R1Br5vxYpYIub2P5Hdc8pdWMOGmwFyoUshiEB62JWHTl8H1kACJR18Z8aMXbnk5orG28br2kmVgtVZKqOSoiiWrQoeKTqrRV0t7ua8uY5HdDUaKpnYKyOdpagsSPn3WEj8op4vHctGL3svOWOjZhq6F2XeVPMR7YsbiwBE8fjT3VhTB3KRlBtWZd1rE0Qo2EtSplWyjGKv1liAEiL0ndQoLeeSOCH4rTP7'
            };
        } else {
            // Password sign-in
            return {
                access_token: '5JhTdKI7PpoZv4ROsFoERc6wCHALKFH5jxozwOOAErmUzWrFNARuH1q01TYTKeZkPW7FmV5MJ2fU00pg9sm4jtH3Z1LjCf8D6nNqLYCfFb2YEKyuvG7zHj4jZqSYVodN2YTCkcHv6k8oJ54QXzNTLIDMlCevkOebm5OjxGiJpafMxncm043q9u1QhdU9eee3zouGRMVVp8zkKVoo5zlGMi3zvS2XDpx7xsfk8hKHpUgd7EDDQxmMueifWv7hv6n',
                expires_in: 3600,
                refresh_token: 'XP13eDjwV5mxOcrq1jkIY9idhdvN3R1Br5vxYpYIub2P5Hdc8pdWMOGmwFyoUshiEB62JWHTl8H1kACJR18Z8aMXbnk5orG28br2kmVgtVZKqOSoiiWrQoeKTqrRV0t7ua8uY5HdDUaKpnYKyOdpagsSPn3WEj8op4vHctGL3svOWOjZhq6F2XeVPMR7YsbiwBE8fjT3VhTB3KRlBtWZd1rE0Qo2EtSplWyjGKv1liAEiL0ndQoLeeSOCH4rTP7',
                token_type: 'Bearer'
            };
        }
    });

    server.post('/authentication/passwordreset', function (db, request) {
        let {passwordreset} = JSON.parse(request.requestBody);
        // eslint-disable-next-line ember-suave/prefer-destructuring
        let email = passwordreset[0].email;

        if (email === 'unknown@example.com') {
            return new Mirage.Response(404, {}, {
                errors: [
                    {
                        message: 'There is no user with that email address.',
                        errorType: 'NotFoundError'
                    }
                ]
            });
        } else {
            return {
                passwordreset: [
                    {message: 'Check your email for further instructions.'}
                ]
            };
        }
    });

    server.get('/authentication/invitation/', function (db, request) {
        let {email} = request.queryParams;
        let [invite] = db.invites.where({email});
        let user = db.users.find(invite.created_by);
        let valid = !!invite;
        let invitedBy = user && user.name;

        return {
            invitation: [{
                valid,
                invitedBy
            }]
        };
    });

    /* Setup ---------------------------------------------------------------- */

    server.post('/authentication/setup', function (db, request) {
        let [attrs] = JSON.parse(request.requestBody).setup;
        let [role] = db.roles.where({name: 'Owner'});
        let user;

        // create owner role unless already exists
        if (!role) {
            role = db.roles.insert({name: 'Owner'});
        }
        attrs.roles = [role];

        if (!isBlank(attrs.email)) {
            attrs.slug = attrs.email.split('@')[0].dasherize();
        }

        // NOTE: this does not use the user factory to fill in blank fields
        user = db.users.insert(attrs);

        delete user.roles;

        return {
            users: [user]
        };
    });

    server.get('/authentication/setup/', function () {
        return {
            setup: [
                {status: true}
            ]
        };
    });
}
