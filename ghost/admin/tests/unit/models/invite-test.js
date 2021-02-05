import Pretender from 'pretender';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {setupTest} from 'ember-mocha';

describe('Unit: Model: invite', function () {
    setupTest();

    describe('with network', function () {
        let server;

        beforeEach(function () {
            server = new Pretender();
        });

        afterEach(function () {
            server.shutdown();
        });

        it('resend hits correct endpoint', function () {
            let store = this.owner.lookup('service:store');
            let model = store.createRecord('invite');
            let role;

            server.post(`${ghostPaths().apiRoot}/invites/`, function () {
                return [200, {}, '{}'];
            });

            run(() => {
                role = store.push({data: {id: 1, type: 'role', attributes: {name: 'Editor'}}});
                model.set('email', 'resend-test@example.com');
                model.set('role', role);
                model.resend();
            });

            expect(
                server.handledRequests.length,
                'number of requests'
            ).to.equal(1);

            let [lastRequest] = server.handledRequests;
            let requestBody = JSON.parse(lastRequest.requestBody);
            let [invite] = requestBody.invites;

            expect(
                requestBody.invites.length,
                'number of invites in request body'
            ).to.equal(1);

            expect(invite.email).to.equal('resend-test@example.com');
            // eslint-disable-next-line camelcase
            expect(invite.role_id, 'role ID').to.equal('1');
        });
    });
});
