import {describe, it} from 'mocha'; import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: utils', function () {
    setupTest();

    describe('cleanTrackedUrl', function () {
        let utilsService;
        beforeEach(function () {
            utilsService = this.owner.lookup('service:utils');
        });

        it('removes protocol and www from url if display is true', function () {
            const url = 'https://www.ghost.org';
            const output = utilsService.cleanTrackedUrl(url, true);
            expect(output).to.equal('ghost.org');
        });

        it('removes tracking params from the url', function () {
            const url = 'https://www.ghost.org?ref=123&attribution_id=something&attribution_type=something&leave=123';
            const output = utilsService.cleanTrackedUrl(url, false);
            expect(output).to.equal('https://www.ghost.org/?leave=123');
        });
    });
});
