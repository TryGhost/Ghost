import Pretender from 'pretender';
import wait from 'ember-test-helpers/wait';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

function stubAvailableTimezonesEndpoint(server) {
    server.get('/ghost/api/v0.1/configuration/timezones', function () {
        return [
            200,
            {'Content-Type': 'application/json'},
            JSON.stringify({
                configuration: [{
                    timezones: [{
                        label: '(GMT -11:00) Midway Island, Samoa',
                        name: 'Pacific/Pago_Pago',
                        offset: -660
                    },
                    {
                        label: '(GMT) Greenwich Mean Time : Dublin, Edinburgh, London',
                        name: 'Europe/Dublin',
                        offset: 0
                    }]
                }]
            })
        ];
    });
}

describe('Integration: Service: config', function () {
    setupTest('service:config', {
        integration: true
    });

    let server;

    beforeEach(function () {
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    it('returns a list of timezones in the expected format', function (done) {
        let service = this.subject();
        stubAvailableTimezonesEndpoint(server);

        service.get('availableTimezones').then(function (timezones) {
            expect(timezones.length).to.equal(2);
            expect(timezones[0].name).to.equal('Pacific/Pago_Pago');
            expect(timezones[0].label).to.equal('(GMT -11:00) Midway Island, Samoa');
            expect(timezones[1].name).to.equal('Europe/Dublin');
            expect(timezones[1].label).to.equal('(GMT) Greenwich Mean Time : Dublin, Edinburgh, London');
            done();
        });
    });

    it('normalizes blogUrl to non-trailing-slash', function (done) {
        let stubBlogUrl = function stubBlogUrl(blogUrl) {
            server.get('/ghost/api/v0.1/configuration/', function () {
                return [
                    200,
                    {'Content-Type': 'application/json'},
                    JSON.stringify({
                        configuration: [{
                            blogUrl
                        }]
                    })
                ];
            });
        };
        let service = this.subject();

        stubBlogUrl('http://localhost:2368/');

        service.fetch().then(() => {
            expect(
                service.get('blogUrl'), 'trailing-slash'
            ).to.equal('http://localhost:2368');
        });

        wait().then(() => {
            stubBlogUrl('http://localhost:2368');

            service.fetch().then(() => {
                expect(
                    service.get('blogUrl'), 'non-trailing-slash'
                ).to.equal('http://localhost:2368');

                done();
            });
        });
    });
});
