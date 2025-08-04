import Service from '@ember/service';
import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

const isValidUrl = (str) => {
    try {
        new URL(str); return true;
    } catch {
        return false;
    }
};

describe('Unit: Service: migrate', function () {
    setupTest();

    let migrateService;

    beforeEach(function () {
        migrateService = this.owner.lookup('service:migrate');
    });

    it('exists', function () {
        expect(migrateService).to.be.ok;
    });

    it('can generate valid payload', async function () {
        sinon.stub(migrateService, 'apiKey').resolves('abcd:1234');

        this.owner.register('service:billing', Service.extend({
            getOwnerUser: () => {
                return {
                    email: 'name@example.com'
                };
            }
        }));

        let payload = await migrateService.postMessagePayload();

        expect(payload).to.be.an('object').that.has.all.keys('apiUrl', 'apiKey', 'stripe', 'ghostVersion', 'ownerEmail');
        expect(isValidUrl(payload.apiUrl)).to.be.true;
        expect(payload.apiUrl.endsWith('/ghost')).to.be.true;
        expect(payload.apiKey).to.equal('abcd:1234');
        expect(payload.stripe).to.be.false;
        expect(payload.ghostVersion).to.be.string;
        expect(payload.ownerEmail).to.equal('name@example.com');
    });
});
