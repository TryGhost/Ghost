import { expect } from 'chai';
import { describeModel, it } from 'ember-mocha';
import run from 'ember-runloop';
import Pretender from 'pretender';

describeModel(
    'notification',
    'Unit: Serializer: notification',
    {
        // Specify the other units that are required for this test.
        needs: ['serializer:notification']
    },

    function () {
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
    }
);
