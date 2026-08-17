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

        this.owner.register('service:feature', Service.extend({
            csvContentImporter: false
        }));

        let payload = await migrateService.postMessagePayload();

        expect(payload).to.be.an('object').that.has.all.keys('apiUrl', 'apiKey', 'stripe', 'csvContentImporter', 'ghostVersion', 'ownerEmail');
        expect(isValidUrl(payload.apiUrl)).to.be.true;
        expect(payload.apiUrl.endsWith('/ghost')).to.be.true;
        expect(payload.apiKey).to.equal('abcd:1234');
        expect(payload.stripe).to.be.false;
        expect(payload.csvContentImporter).to.be.false;
        expect(payload.ghostVersion).to.be.string;
        expect(payload.ownerEmail).to.equal('name@example.com');
    });

    it('reports csvContentImporter as enabled when the labs flag is on', async function () {
        sinon.stub(migrateService, 'apiKey').resolves('abcd:1234');

        this.owner.register('service:billing', Service.extend({
            getOwnerUser: () => {
                return {
                    email: 'name@example.com'
                };
            }
        }));

        this.owner.register('service:feature', Service.extend({
            csvContentImporter: true
        }));

        let payload = await migrateService.postMessagePayload();

        expect(payload.csvContentImporter).to.be.true;
    });
});
