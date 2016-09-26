import { expect } from 'chai';
import { describeModel, it } from 'ember-mocha';
import run from 'ember-runloop';
import Pretender from 'pretender';

describeModel(
    'invite',
    'Unit: Model: invite',
    {
        needs: [
            'model:role',
            'serializer:application',
            'serializer:invite',
            'transform:moment-utc',
            'service:ghost-paths',
            'service:ajax',
            'service:session',
            'service:feature'
        ]
    },
    function() {
        it('role property returns first role in array', function () {
            let model = this.subject();

            run(() => {
                let role = this.store().push({data: {id: 1, type: 'role', attributes: {name: 'Author'}}});
                model.get('roles').pushObject(role);
            });
            expect(model.get('role.name')).to.equal('Author');

            run(() => {
                let role = this.store().push({data: {id: 1, type: 'role', attributes: {name: 'Editor'}}});
                model.set('role', role);
            });
            expect(model.get('role.name')).to.equal('Editor');
        });

        describe('with network', function () {
            let server;

            beforeEach(function () {
                server = new Pretender();
            });

            afterEach(function () {
                server.shutdown();
            });

            it('resend hits correct endpoint', function () {
                let model = this.subject();
                let role;

                server.post('/ghost/api/v0.1/invites/', function () {
                    return [200, {}, '{}'];
                });

                run(() => {
                    role = this.store().push({data: {id: 1, type: 'role', attributes: {name: 'Editor'}}});
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
                expect(
                    invite.roles.length,
                    'number of roles in request body'
                ).to.equal(1);
                expect(invite.roles[0], 'role ID').to.equal('1');
            });
        });
    }
);
