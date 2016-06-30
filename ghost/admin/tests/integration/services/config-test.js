import { expect } from 'chai';
import {
    describeModule,
    it
} from 'ember-mocha';
import Pretender from 'pretender';

function stubAvailableTimezonesEndpoint(server) {
    server.get('/ghost/api/v0.1/configuration/timezones', function (request) {
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

describeModule(
    'service:config',
    'Integration: Service: config',
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
    }
);
