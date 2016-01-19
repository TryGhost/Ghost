import {
    describeModule,
    it
} from 'ember-mocha';
import Pretender from 'pretender';
import wait from 'ember-test-helpers/wait';
import FeatureService, {feature} from 'ghost/services/feature';

function stubSettings(server, labs) {
    server.get('/ghost/api/v0.1/settings/', function () {
        return [200, {'Content-Type': 'application/json'}, JSON.stringify({settings: [{
            id: '1',
            type: 'blog',
            key: 'labs',
            value: JSON.stringify(labs)
        }]})];
    });

    server.put('/ghost/api/v0.1/settings/', function (request) {
        return [200, {'Content-Type': 'application/json'}, request.requestBody];
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

            return wait().then(() => {
                expect(service.get('labs').testFlag).to.be.true;
                done();
            });
        });

        it('returns false for set flag with config false and labs false', function (done) {
            stubSettings(server, {testFlag: false});
            addTestFlag();

            let service = this.subject();
            service.get('config').set('testFlag', false);

            return wait().then(() => {
                expect(service.get('labs').testFlag).to.be.false;
                expect(service.get('testFlag')).to.be.false;
                done();
            });
        });

        it('returns true for set flag with config true and labs false', function (done) {
            stubSettings(server, {testFlag: false});
            addTestFlag();

            let service = this.subject();
            service.get('config').set('testFlag', true);

            return wait().then(() => {
                expect(service.get('labs').testFlag).to.be.false;
                expect(service.get('testFlag')).to.be.true;
                done();
            });
        });

        it('returns true for set flag with config false and labs true', function (done) {
            stubSettings(server, {testFlag: true});
            addTestFlag();

            let service = this.subject();
            service.get('config').set('testFlag', false);

            return wait().then(() => {
                expect(service.get('labs').testFlag).to.be.true;
                expect(service.get('testFlag')).to.be.true;
                done();
            });
        });

        it('returns true for set flag with config true and labs true', function (done) {
            stubSettings(server, {testFlag: true});
            addTestFlag();

            let service = this.subject();
            service.get('config').set('testFlag', true);

            return wait().then(() => {
                expect(service.get('labs').testFlag).to.be.true;
                expect(service.get('testFlag')).to.be.true;
                done();
            });
        });

        it('saves correctly', function (done) {
            stubSettings(server, {testFlag: false});
            addTestFlag();

            let service = this.subject();

            return wait().then(() => {
                expect(service.get('testFlag')).to.be.false;

                service.set('testFlag', true);

                return wait().then(() => {
                    expect(server.handlers[1].numberOfCalls).to.equal(1);
                    expect(service.get('testFlag')).to.be.true;
                    done();
                });
            });
        });
    }
);
