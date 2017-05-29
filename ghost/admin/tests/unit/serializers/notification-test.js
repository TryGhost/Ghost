import Pretender from 'pretender';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupModelTest} from 'ember-mocha';

describe('Unit: Serializer: notification', function () {
    setupModelTest('notification', {
        // Specify the other units that are required for this test.
        needs: ['serializer:notification']
    });

    let server;

    beforeEach(function () {
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    it('converts location->key when deserializing', function () {
        server.get('/notifications', function () {
            let response = {
                notifications: [{
                    id: 1,
                    dismissible: false,
                    status: 'alert',
                    type: 'info',
                    location: 'test.foo',
                    message: 'This is a test'
                }]
            };

            return [200, {'Content-Type': 'application/json'}, JSON.stringify(response)];
        });

        return this.store().findAll('notification').then((notifications) => {
            expect(notifications.get('length')).to.equal(1);
            expect(notifications.get('firstObject.key')).to.equal('test.foo');
        });
    });
});
