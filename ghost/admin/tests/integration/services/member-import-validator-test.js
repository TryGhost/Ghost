import Pretender from 'pretender';
import Service from '@ember/service';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

let MembersUtilsStub = Service.extend({
    isStripeEnabled: true
});

describe('Integration: Service: member-import-validator', function () {
    setupTest();

    let server;

    beforeEach(function () {
        server = new Pretender();
        this.owner.register('service:membersUtils', MembersUtilsStub);
    });

    afterEach(function () {
        server.shutdown();
    });

    it('checks correct data without Stripe customer', async function () {
        let service = this.owner.lookup('service:member-import-validator');

        const mapping = await service.check([{
            name: 'Rish',
            email: 'validemail@example.com'
        }]);

        expect(mapping.email).to.equal('email');
    });

    describe('data sampling method', function () {
        it('returns whole data set when sampled size is less then default 30', async function () {
            this.owner.register('service:membersUtils', Service.extend({
                isStripeEnabled: false
            }));

            let service = this.owner.lookup('service:member-import-validator');

            const result = await service._sampleData([{
                email: 'email@example.com'
            }, {
                email: 'email2@example.com'
            }]);

            expect(result.length).to.equal(2);
        });

        it('returns dataset with sample size for non empty values only', async function () {
            this.owner.register('service:membersUtils', Service.extend({
                isStripeEnabled: false
            }));

            let service = this.owner.lookup('service:member-import-validator');
            let data = [{
                email: null
            }, {
                email: 'email2@example.com'
            }, {
                email: 'email3@example.com'
            }, {
                email: 'email4@example.com'
            }, {
                email: ''
            }];

            const result = await service._sampleData(data, 3);

            expect(result.length).to.equal(3);
            expect(result[0].email).to.equal('email2@example.com');
            expect(result[1].email).to.equal('email3@example.com');
            expect(result[2].email).to.equal('email4@example.com');
        });

        it('returns dataset with sample size for non empty values for objects with multiple properties', async function () {
            this.owner.register('service:membersUtils', Service.extend({
                isStripeEnabled: false
            }));

            let service = this.owner.lookup('service:member-import-validator');
            let data = [{
                email: null,
                other_prop: 'non empty 1'
            }, {
                email: 'email2@example.com',
                other_prop: 'non empty 2'
            }, {
                email: 'email3@example.com',
                other_prop: ''
            }, {
                email: 'email4@example.com'
            }, {
                email: '',
                other_prop: 'non empty 5'
            }];

            const result = await service._sampleData(data, 3);

            expect(result.length).to.equal(3);
            expect(result[0].email).to.equal('email2@example.com');
            expect(result[0].other_prop).to.equal('non empty 1');
            expect(result[1].email).to.equal('email3@example.com');
            expect(result[1].other_prop).to.equal('non empty 2');
            expect(result[2].email).to.equal('email4@example.com');
            expect(result[2].other_prop).to.equal('non empty 5');
        });
    });

    describe('data detection method', function () {
        it('correctly detects only email mapping', async function () {
            this.owner.register('service:membersUtils', Service.extend({
                isStripeEnabled: false
            }));

            let service = this.owner.lookup('service:member-import-validator');

            const result = service._detectDataTypes([{
                correo_electronico: 'email@example.com'
            }, {
                correo_electronico: 'email2@example.com'
            }]);

            expect(result.email).to.equal('correo_electronico');
            expect(result.stripe_customer_id).to.equal(undefined);
        });

        it('correctly detects only email mapping', async function () {
            this.owner.register('service:membersUtils', Service.extend({
                isStripeEnabled: false
            }));

            let service = this.owner.lookup('service:member-import-validator');

            const result = service._detectDataTypes([{
                correo_electronico: 'email@example.com',
                stripe_id: ''
            }, {
                correo_electronico: '',
                stripe_id: 'cus_'
            }]);

            expect(result.email).to.equal('correo_electronico');
        });

        it('correctly detects variation of "name" mapping', async function () {
            this.owner.register('service:membersUtils', Service.extend({
                isStripeEnabled: false
            }));

            let service = this.owner.lookup('service:member-import-validator');

            const result = service._detectDataTypes([{
                first_name: 'Rish'
            }]);

            expect(result.name).to.equal('first_name');
        });
    });
});
