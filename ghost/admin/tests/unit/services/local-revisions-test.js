import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: local-revisions', function () {
    setupTest();

    this.beforeEach(function () {
        this.localRevisionsService = this.owner.lookup('service:local-revisions');
    });

    it('exists', function () {
        expect(this.localRevisionsService).to.be.ok;
    });
});