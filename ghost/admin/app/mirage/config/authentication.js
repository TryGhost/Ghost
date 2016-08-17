/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Mirage from 'ember-cli-mirage';
import $ from 'jquery';
import {isBlank} from 'ember-utils';

export default function mockAuthentication(server) {
    server.post('/authentication/token', function () {
        return {
            access_token: '5JhTdKI7PpoZv4ROsFoERc6wCHALKFH5jxozwOOAErmUzWrFNARuH1q01TYTKeZkPW7FmV5MJ2fU00pg9sm4jtH3Z1LjCf8D6nNqLYCfFb2YEKyuvG7zHj4jZqSYVodN2YTCkcHv6k8oJ54QXzNTLIDMlCevkOebm5OjxGiJpafMxncm043q9u1QhdU9eee3zouGRMVVp8zkKVoo5zlGMi3zvS2XDpx7xsfk8hKHpUgd7EDDQxmMueifWv7hv6n',
            expires_in: 3600,
            refresh_token: 'XP13eDjwV5mxOcrq1jkIY9idhdvN3R1Br5vxYpYIub2P5Hdc8pdWMOGmwFyoUshiEB62JWHTl8H1kACJR18Z8aMXbnk5orG28br2kmVgtVZKqOSoiiWrQoeKTqrRV0t7ua8uY5HdDUaKpnYKyOdpagsSPn3WEj8op4vHctGL3svOWOjZhq6F2XeVPMR7YsbiwBE8fjT3VhTB3KRlBtWZd1rE0Qo2EtSplWyjGKv1liAEiL0ndQoLeeSOCH4rTP7',
            token_type: 'Bearer'
        };
    });

    server.post('/authentication/passwordreset', function (db, request) {
        // jscs:disable requireObjectDestructuring
        let {passwordreset} = $.deparam(request.requestBody);
        let email = passwordreset[0].email;
        // jscs:enable requireObjectDestructuring

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

    /* Setup ---------------------------------------------------------------- */

    server.post('/authentication/setup', function (db, request) {
        let [attrs] = $.deparam(request.requestBody).setup;
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
