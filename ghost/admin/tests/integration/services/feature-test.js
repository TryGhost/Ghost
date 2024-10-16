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
    const site = [];

    const settings = [
        {
            id: '1',
            type: 'labs',
            key: 'labs',
            value: JSON.stringify(labs)
        }
    ];

    server.get(`${ghostPaths().apiRoot}/site/`, function () {
        return [200, {'Content-Type': 'application/json'}, JSON.stringify({site})];
    });

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

        await service.fetch();
        expect(service.get('testFlag')).to.be.true;
        expect(service.get('testUserFlag')).to.be.true;
    });

    it('returns false for set flag with config false and labs false', async function () {
        stubSettings(server, {testFlag: false});
        stubUser(server, {});

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');
        service.config.testFlag = false;

        await service.fetch();
        expect(service.get('labs.testFlag')).to.be.false;
        expect(service.get('testFlag')).to.be.false;
    });

    it('returns true for set flag with config true and labs false', async function () {
        stubSettings(server, {testFlag: false});
        stubUser(server, {});

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');
        service.config.testFlag = true;

        await service.fetch();
        expect(service.get('labs.testFlag')).to.be.false;
        expect(service.get('testFlag')).to.be.true;
    });

    it('returns true for set flag with config is an object and labs true', async function () {
        stubSettings(server, {testFlag: true});
        stubUser(server, {});

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');
        service.config.testFlag = {key: 'value'};

        await service.fetch();
        expect(service.get('labs.testFlag')).to.be.true;
        expect(service.get('testFlag')).to.be.true;
    });

    it('returns true for set flag with config true and labs true', async function () {
        stubSettings(server, {testFlag: true});
        stubUser(server, {});

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');
        service.config.testFlag = true;

        await service.fetch();
        expect(service.get('labs.testFlag')).to.be.true;
        expect(service.get('testFlag')).to.be.true;
    });

    it('returns false for set flag with accessibility false', async function () {
        stubSettings(server, {});
        stubUser(server, {testUserFlag: false});

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');

        await service.fetch();
        expect(service.get('accessibility.testUserFlag')).to.be.false;
        expect(service.get('testUserFlag')).to.be.false;
    });

    it('returns true for set flag with accessibility true', async function () {
        stubSettings(server, {});
        stubUser(server, {testUserFlag: true});

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');

        await service.fetch();
        expect(service.get('accessibility.testUserFlag')).to.be.true;
        expect(service.get('testUserFlag')).to.be.true;
    });

    it('saves labs setting correctly', async function () {
        stubSettings(server, {testFlag: false});
        stubUser(server, {testUserFlag: false});

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');
        service.config.testFlag = {key: 'value'};

        await service.fetch();
        expect(service.get('testFlag')).to.be.false;

        run(() => {
            service.set('testFlag', true);
        });

        await settled();

        expect(server.handlers[2].numberOfCalls).to.equal(1);
        expect(service.get('testFlag')).to.be.true;
    });

    it('saves accessibility setting correctly', async function () {
        stubSettings(server, {});
        stubUser(server, {testUserFlag: false});

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');

        await service.fetch();
        expect(service.get('testUserFlag')).to.be.false;

        run(() => {
            service.set('testUserFlag', true);
        });

        await settled();
        expect(server.handlers[4].numberOfCalls).to.equal(1);
        expect(service.get('testUserFlag')).to.be.true;
    });

    it('notifies for server errors on labs save', async function () {
        stubSettings(server, {testFlag: false}, false);
        stubUser(server, {});

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');
        service.config.testFlag = false;

        await service.fetch();
        expect(service.get('testFlag')).to.be.false;

        run(() => {
            service.set('testFlag', true);
        });

        await settled();
        expect(
            server.handlers[2].numberOfCalls,
            'PUT call is made'
        ).to.equal(1);

        expect(
            service.get('notifications.alerts').length,
            'number of alerts shown'
        ).to.equal(1);

        expect(service.get('testFlag')).to.be.false;
    });

    it('notifies for server errors on accessibility save', async function () {
        stubSettings(server, {});
        stubUser(server, {testUserFlag: false}, false);

        addTestFlag();

        let session = this.owner.lookup('service:session');
        await session.populateUser();

        let service = this.owner.lookup('service:feature');

        await service.fetch();
        expect(service.get('testUserFlag')).to.be.false;

        run(() => {
            service.set('testUserFlag', true);
        });

        await settled();
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

    it('notifies for validation errors', async function () {
        stubSettings(server, {testFlag: false}, true, false);
        stubUser(server, {});

        addTestFlag();

        let sessionService = this.owner.lookup('service:session');
        await sessionService.populateUser();

        let featureService = this.owner.lookup('service:feature');
        featureService.config.testFlag = false;

        await featureService.fetch();
        expect(featureService.get('testFlag'), 'testFlag before set').to.be.false;

        run(() => {
            expect(() => {
                featureService.set('testFlag', true);
            }, EmberError, 'threw validation error');
        });

        await settled();
        // ensure validation is happening before the API is hit
        expect(server.handlers[2].numberOfCalls).to.equal(0);
        expect(featureService.get('testFlag')).to.be.false;
    });

    it('has correct labs flags when accessed before and after settings load', async function () {
        stubSettings(server, {testFlag: true});
        stubUser(server, {});

        addTestFlag();

        const settingsService = this.owner.lookup('service:settings');
        const featureService = this.owner.lookup('service:feature');

        expect(featureService.testFlag, 'testFlag before settings fetch').to.be.false;

        await settingsService.fetch();

        expect(featureService.settings.labs, 'feature.settings.labs after settings fetch').to.equal('{"testFlag":true}');
        expect(featureService.labs, 'feature.labs after settings fetch').to.deep.equal({testFlag: true});
        expect(featureService.testFlag, 'feature.testFlag after settings fetch').to.be.true;
    });
});
