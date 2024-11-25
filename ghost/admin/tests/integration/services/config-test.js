import Pretender from 'pretender';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {settled} from '@ember/test-helpers';
import {setupTest} from 'ember-mocha';

describe('Integration: Service: config-manager', function () {
    setupTest();

    let server;

    beforeEach(function () {
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    it('returns a list of timezones in the expected format', function () {
        const injection = this.owner.lookup('config:main');
        const timezones = injection.availableTimezones;

        expect(timezones.length).to.equal(67);
        expect(timezones[0].name).to.equal('Pacific/Pago_Pago');
        expect(timezones[0].label).to.equal('(GMT -11:00) Midway Island, Samoa');
        expect(timezones[1].name).to.equal('Pacific/Honolulu');
        expect(timezones[1].label).to.equal('(GMT -10:00) Hawaii');
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
        const service = this.owner.lookup('service:config-manager');
        const injection = this.owner.lookup('config:main');

        stubBlogUrl('http://localhost:2368/');

        service.fetch().then(() => {
            expect(
                injection.blogUrl, 'trailing-slash'
            ).to.equal('http://localhost:2368');
        });

        settled().then(() => {
            stubBlogUrl('http://localhost:2368');

            service.fetch().then(() => {
                expect(
                    injection.blogUrl, 'non-trailing-slash'
                ).to.equal('http://localhost:2368');

                done();
            });
        });
    });
});
