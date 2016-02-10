import {
    describeModule,
    it
} from 'ember-mocha';
import Pretender from 'pretender';
import wait from 'ember-test-helpers/wait';
import FeatureService, {feature} from 'ghost/services/feature';
import Ember from 'ember';
import { errorOverride, errorReset } from 'ghost/tests/helpers/adapter-error';

const {merge, run} = Ember;
const EmberError = Ember.Error;

function stubSettings(server, labs, validSave = true, validSettings = true) {
    let settings = [
        {
            id: '1',
            type: 'blog',
            key: 'labs',
            value: JSON.stringify(labs)
        }
    ];

    if (validSettings) {
        settings.push({
            id: '2',
            type: 'blog',
            key: 'postsPerPage',
            value: 1
        });
    }

    server.get('/ghost/api/v0.1/settings/', function () {
        return [200, {'Content-Type': 'application/json'}, JSON.stringify({settings})];
    });

    server.put('/ghost/api/v0.1/settings/', function (request) {
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
        testFlag: feature('testFlag')
    });
}

describeModule(
    'service:feature',
    'Integration: Service: feature',
    {
        integration: true
    },
    function () {
        let server;

        beforeEach(function () {
            server = new Pretender();
        });

        afterEach(function () {
            server.shutdown();
        });

        it('loads labs settings correctly', function (done) {
            stubSettings(server, {testFlag: true});

            let service = this.subject();

            service.get('labs').then((labs) => {
                expect(labs.testFlag).to.be.true;
                done();
            });
        });

        it('returns false for set flag with config false and labs false', function (done) {
            stubSettings(server, {testFlag: false});
            addTestFlag();

            let service = this.subject();
            service.get('config').set('testFlag', false);

            let testFlag, labsTestFlag;

            service.get('testFlag').then((result) => {
                testFlag = result;
            });

            service.get('labs').then((labs) => {
                labsTestFlag = labs.testFlag;
            });

            return wait().then(() => {
                expect(labsTestFlag).to.be.false;
                expect(testFlag).to.be.false;
                done();
            });
        });

        it('returns true for set flag with config true and labs false', function (done) {
            stubSettings(server, {testFlag: false});
            addTestFlag();

            let service = this.subject();
            service.get('config').set('testFlag', true);

            let testFlag, labsTestFlag;

            service.get('testFlag').then((result) => {
                testFlag = result;
            });

            service.get('labs').then((labs) => {
                labsTestFlag = labs.testFlag;
            });

            return wait().then(() => {
                expect(labsTestFlag).to.be.false;
                expect(testFlag).to.be.true;
                done();
            });
        });

        it('returns true for set flag with config false and labs true', function (done) {
            stubSettings(server, {testFlag: true});
            addTestFlag();

            let service = this.subject();
            service.get('config').set('testFlag', false);

            let testFlag, labsTestFlag;

            service.get('testFlag').then((result) => {
                testFlag = result;
            });

            service.get('labs').then((labs) => {
                labsTestFlag = labs.testFlag;
            });

            return wait().then(() => {
                expect(labsTestFlag).to.be.true;
                expect(testFlag).to.be.true;
                done();
            });
        });

        it('returns true for set flag with config true and labs true', function (done) {
            stubSettings(server, {testFlag: true});
            addTestFlag();

            let service = this.subject();
            service.get('config').set('testFlag', true);

            let testFlag, labsTestFlag;

            service.get('testFlag').then((result) => {
                testFlag = result;
            });

            service.get('labs').then((labs) => {
                labsTestFlag = labs.testFlag;
            });

            return wait().then(() => {
                expect(labsTestFlag).to.be.true;
                expect(testFlag).to.be.true;
                done();
            });
        });

        it('saves correctly', function (done) {
            stubSettings(server, {testFlag: false});
            addTestFlag();

            let service = this.subject();

            run(() => {
                service.get('testFlag').then((testFlag) => {
                    expect(testFlag).to.be.false;
                });
            });

            run(() => {
                service.set('testFlag', true);
            });

            return wait().then(() => {
                expect(server.handlers[1].numberOfCalls).to.equal(1);

                service.get('testFlag').then((testFlag) => {
                    expect(testFlag).to.be.true;
                    done();
                });
            });
        });

        it('notifies for server errors', function (done) {
            stubSettings(server, {testFlag: false}, false);
            addTestFlag();

            let service = this.subject();

            run(() => {
                service.get('testFlag').then((testFlag) => {
                    expect(testFlag).to.be.false;
                });
            });

            run(() => {
                service.set('testFlag', true);
            });

            return wait().then(() => {
                expect(server.handlers[1].numberOfCalls).to.equal(1);

                expect(service.get('notifications.notifications').length).to.equal(1);

                service.get('testFlag').then((testFlag) => {
                    expect(testFlag).to.be.false;
                    done();
                });
            });
        });

        it('notifies for validation errors', function (done) {
            stubSettings(server, {testFlag: false}, true, false);
            addTestFlag();

            let service = this.subject();

            run(() => {
                service.get('testFlag').then((testFlag) => {
                    expect(testFlag).to.be.false;
                });
            });

            run(() => {
                expect(() => {
                    service.set('testFlag', true);
                }, EmberError, 'Threw validation error');
            });

            service.get('testFlag').then((testFlag) => {
                expect(testFlag).to.be.false;
                done();
            });
        });
    }
);
