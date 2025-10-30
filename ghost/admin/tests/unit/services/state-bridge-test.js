import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: state-bridge', function () {
    setupTest();

    describe('#triggerEmberDataChange', function () {
        it('triggers emberDataChange event with correct parameters', function () {
            const stateBridge = this.owner.lookup('service:state-bridge');
            const handler = sinon.spy();

            stateBridge.on('emberDataChange', handler);

            const mockResponse = {
                posts: [{id: '123', title: 'Test Post'}]
            };

            stateBridge.triggerEmberDataChange('create', 'post', '123', mockResponse);

            expect(handler.calledOnce).to.be.true;
            expect(handler.firstCall.args[0]).to.deep.equal({
                operation: 'create',
                modelName: 'post',
                id: '123',
                data: mockResponse
            });
        });

        it('triggers event for update operation', function () {
            const stateBridge = this.owner.lookup('service:state-bridge');
            const handler = sinon.spy();

            stateBridge.on('emberDataChange', handler);

            const mockResponse = {
                users: [{id: '456', name: 'John Doe'}]
            };

            stateBridge.triggerEmberDataChange('update', 'user', '456', mockResponse);

            expect(handler.calledOnce).to.be.true;
            expect(handler.firstCall.args[0]).to.deep.equal({
                operation: 'update',
                modelName: 'user',
                id: '456',
                data: mockResponse
            });
        });

        it('triggers event for delete operation with null data', function () {
            const stateBridge = this.owner.lookup('service:state-bridge');
            const handler = sinon.spy();

            stateBridge.on('emberDataChange', handler);

            stateBridge.triggerEmberDataChange('delete', 'tag', '789', null);

            expect(handler.calledOnce).to.be.true;
            expect(handler.firstCall.args[0]).to.deep.equal({
                operation: 'delete',
                modelName: 'tag',
                id: '789',
                data: null
            });
        });

        it('allows multiple handlers to be registered', function () {
            const stateBridge = this.owner.lookup('service:state-bridge');
            const handler1 = sinon.spy();
            const handler2 = sinon.spy();

            stateBridge.on('emberDataChange', handler1);
            stateBridge.on('emberDataChange', handler2);

            const mockResponse = {
                newsletters: [{id: '111', name: 'Weekly Update'}]
            };

            stateBridge.triggerEmberDataChange('create', 'newsletter', '111', mockResponse);

            expect(handler1.calledOnce).to.be.true;
            expect(handler2.calledOnce).to.be.true;
            expect(handler1.firstCall.args[0]).to.deep.equal(handler2.firstCall.args[0]);
        });

        it('handlers can be removed with off', function () {
            const stateBridge = this.owner.lookup('service:state-bridge');
            const handler = sinon.spy();

            stateBridge.on('emberDataChange', handler);
            stateBridge.off('emberDataChange', handler);

            stateBridge.triggerEmberDataChange('update', 'setting', '999', {});

            expect(handler.called).to.be.false;
        });

        it('handles multiple triggers correctly', function () {
            const stateBridge = this.owner.lookup('service:state-bridge');
            const handler = sinon.spy();

            stateBridge.on('emberDataChange', handler);

            stateBridge.triggerEmberDataChange('create', 'post', '1', {});
            stateBridge.triggerEmberDataChange('update', 'post', '1', {});
            stateBridge.triggerEmberDataChange('delete', 'post', '1', null);

            expect(handler.calledThrice).to.be.true;
            expect(handler.firstCall.args[0].operation).to.equal('create');
            expect(handler.secondCall.args[0].operation).to.equal('update');
            expect(handler.thirdCall.args[0].operation).to.equal('delete');
        });
    });
});
