import EmberError from '@ember/error';
import FeatureService, {feature} from 'ghost-admin/services/feature';
import Pretender from 'pretender';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {settled} from '@ember/test-helpers';
import {setupTest} from 'ember-mocha';

function stubSettings(server, labs, validSave = true) {
    let settings = [
        {
            id: '1',
            type: 'labs',
            key: 'labs',
            value: JSON.stringify(labs)
        }
    ];

    server.get(`${ghostPaths().apiRoot}/settings/`, function () {
        return [200, {'Content-Type': 'application/json'}, JSON.stringify({settings})];
    });

    server.put(`${ghostPaths().apiRoot}/settings/`, function (request) {
        let statusCode = (validSave) ? 200 : 400;
        let response = (validSave) ? request.requestBody : JSON.stringify({
            errors: [{
                message: 'Test Error'
            }]
        });

        return [statusCode, {'Content-Type': 'application/json'}, response];
    });
}

function stubUser(server, accessibility, validSave = true) {
    let users = [{
        id: '1',
        // Add extra properties for the validations
        name: 'Test User',
        email: 'test@example.com',
        accessibility: JSON.stringify(accessibility),
        roles: [{
            id: 1,
            name: 'Owner',
            description: 'Owner'
        }]
    }];

    server.get(`${ghostPaths().apiRoot}/users/me/`, function () {
        return [200, {'Content-Type': 'application/json'}, JSON.stringify({users})];
    });

    server.put(`${ghostPaths().apiRoot}/users/1/`, function (request) {
        let statusCode = (validSave) ? 200 : 400;
        let response = (validSave) ? request.requestBody : JSON.stringify({
            errors: [{
                message: 'Test Error'
            }]
        });

        return [statusCode, {'Content-Type': 'application/json'}, response];
    });
}

function addTestFlag() {
    FeatureService.reopen({
        testFlag: feature('testFlag'),
        testUserFlag: feature('testUserFlag', {user: true})
    });
}

describe('Integration: Service: feature', function () {
    setupTest();

    let server;

    beforeEach(function () {
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    it('loads labs and user settings correctly', async function () {
        stubSettings(server, {testFlag: true});
        stubUser(server, {testUserFlag: true});

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');

        return service.fetch().then(() => {
            expect(service.get('testFlag')).to.be.true;
            expect(service.get('testUserFlag')).to.be.true;
        });
    });

    it('returns false for set flag with config false and labs false', async function () {
        stubSettings(server, {testFlag: false});
        stubUser(server, {});

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');
        service.get('config').set('testFlag', false);

        return service.fetch().then(() => {
            expect(service.get('labs.testFlag')).to.be.false;
            expect(service.get('testFlag')).to.be.false;
        });
    });

    it('returns true for set flag with config true and labs false', async function () {
        stubSettings(server, {testFlag: false});
        stubUser(server, {});

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');
        service.get('config').set('testFlag', true);

        return service.fetch().then(() => {
            expect(service.get('labs.testFlag')).to.be.false;
            expect(service.get('testFlag')).to.be.true;
        });
    });

    it('returns true for set flag with config false and labs true', async function () {
        stubSettings(server, {testFlag: true});
        stubUser(server, {});

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');
        service.get('config').set('testFlag', false);

        return service.fetch().then(() => {
            expect(service.get('labs.testFlag')).to.be.true;
            expect(service.get('testFlag')).to.be.true;
        });
    });

    it('returns true for set flag with config true and labs true', async function () {
        stubSettings(server, {testFlag: true});
        stubUser(server, {});

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');
        service.get('config').set('testFlag', true);

        return service.fetch().then(() => {
            expect(service.get('labs.testFlag')).to.be.true;
            expect(service.get('testFlag')).to.be.true;
        });
    });

    it('returns false for set flag with accessibility false', async function () {
        stubSettings(server, {});
        stubUser(server, {testUserFlag: false});

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');

        return service.fetch().then(() => {
            expect(service.get('accessibility.testUserFlag')).to.be.false;
            expect(service.get('testUserFlag')).to.be.false;
        });
    });

    it('returns true for set flag with accessibility true', async function () {
        stubSettings(server, {});
        stubUser(server, {testUserFlag: true});

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');

        return service.fetch().then(() => {
            expect(service.get('accessibility.testUserFlag')).to.be.true;
            expect(service.get('testUserFlag')).to.be.true;
        });
    });

    it('saves labs setting correctly', async function () {
        stubSettings(server, {testFlag: false});
        stubUser(server, {testUserFlag: false});

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');
        service.get('config').set('testFlag', false);

        return service.fetch().then(() => {
            expect(service.get('testFlag')).to.be.false;

            run(() => {
                service.set('testFlag', true);
            });

            return settled().then(() => {
                expect(server.handlers[1].numberOfCalls).to.equal(1);
                expect(service.get('testFlag')).to.be.true;
            });
        });
    });

    it('saves accessibility setting correctly', async function () {
        stubSettings(server, {});
        stubUser(server, {testUserFlag: false});

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');

        return service.fetch().then(() => {
            expect(service.get('testUserFlag')).to.be.false;

            run(() => {
                service.set('testUserFlag', true);
            });

            return settled().then(() => {
                expect(server.handlers[3].numberOfCalls).to.equal(1);
                expect(service.get('testUserFlag')).to.be.true;
            });
        });
    });

    it('notifies for server errors on labs save', async function () {
        stubSettings(server, {testFlag: false}, false);
        stubUser(server, {});

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');
        service.get('config').set('testFlag', false);

        return service.fetch().then(() => {
            expect(service.get('testFlag')).to.be.false;

            run(() => {
                service.set('testFlag', true);
            });

            return settled().then(() => {
                expect(
                    server.handlers[1].numberOfCalls,
                    'PUT call is made'
                ).to.equal(1);

                expect(
                    service.get('notifications.alerts').length,
                    'number of alerts shown'
                ).to.equal(1);

                expect(service.get('testFlag')).to.be.false;
            });
        });
    });

    it('notifies for server errors on accessibility save', async function () {
        stubSettings(server, {});
        stubUser(server, {testUserFlag: false}, false);

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');

        return service.fetch().then(() => {
            expect(service.get('testUserFlag')).to.be.false;

            run(() => {
                service.set('testUserFlag', true);
            });

            return settled().then(() => {
                expect(
                    server.handlers[3].numberOfCalls,
                    'PUT call is made'
                ).to.equal(1);

                expect(
                    service.get('notifications.alerts').length,
                    'number of alerts shown'
                ).to.equal(1);

                expect(service.get('testUserFlag')).to.be.false;
            });
        });
    });

    it('notifies for validation errors', async function () {
        stubSettings(server, {testFlag: false}, true, false);
        stubUser(server, {});

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');
        service.get('config').set('testFlag', false);

        return service.fetch().then(() => {
            expect(service.get('testFlag')).to.be.false;

            run(() => {
                expect(() => {
                    service.set('testFlag', true);
                }, EmberError, 'threw validation error');
            });

            return settled().then(() => {
                // ensure validation is happening before the API is hit
                expect(server.handlers[1].numberOfCalls).to.equal(0);
                expect(service.get('testFlag')).to.be.false;
            });
        });
    });
});
