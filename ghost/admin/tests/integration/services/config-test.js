import Pretender from 'pretender';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {settled} from '@ember/test-helpers';
import {setupTest} from 'ember-mocha';

describe('Integration: Service: config', function () {
    setupTest();

    let server;

    beforeEach(function () {
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    it('returns a list of timezones in the expected format', function (done) {
        let service = this.owner.lookup('service:config');

        service.get('availableTimezones').then(function (timezones) {
            expect(timezones.length).to.equal(66);
            expect(timezones[0].name).to.equal('Pacific/Pago_Pago');
            expect(timezones[0].label).to.equal('(GMT -11:00) Midway Island, Samoa');
            expect(timezones[1].name).to.equal('Pacific/Honolulu');
            expect(timezones[1].label).to.equal('(GMT -10:00) Hawaii');
            done();
        });
    });

    it('normalizes blogUrl to non-trailing-slash', function (done) {
        let stubBlogUrl = function stubBlogUrl(url) {
            server.get(`${ghostPaths().apiRoot}/config/`, function () {
                return [
                    200,
                    {'Content-Type': 'application/json'},
                    JSON.stringify({})
                ];
            });

            server.get(`${ghostPaths().apiRoot}/site/`, function () {
                return [
                    200,
                    {'Content-Type': 'application/json'},
                    JSON.stringify({
                        site: {
                            url
                        }
                    })
                ];
            });
        };
        let service = this.owner.lookup('service:config');

        stubBlogUrl('http://localhost:2368/');

        service.fetch().then(() => {
            expect(
                service.get('blogUrl'), 'trailing-slash'
            ).to.equal('http://localhost:2368');
        });

        settled().then(() => {
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
