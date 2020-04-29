const should = require('should');
const rewire = require('rewire');
const mockUtils = require('../../utils/mocks');

let ghostVersionUtils;
let version;

describe('Utils: Ghost Version', function () {
    const beforeEachIt = function be() {
        mockUtils.modules.mockNonExistentModule(/package\.json/, {version: version});

        ghostVersionUtils = rewire('../../../core/server/lib/ghost-version');
    };

    afterEach(function () {
        mockUtils.modules.unmockNonExistentModule(/package\.json/);
    });

    it('default', function () {
        version = '1.10.0';
        beforeEachIt();

        ghostVersionUtils.full.should.eql(version);
        ghostVersionUtils.original.should.eql(version);
        ghostVersionUtils.safe.should.eql('1.10');
    });

    it('pre-release', function () {
        version = '1.11.1-beta';
        beforeEachIt();

        ghostVersionUtils.full.should.eql(version);
        ghostVersionUtils.original.should.eql(version);
        ghostVersionUtils.safe.should.eql('1.11');
    });

    it('pre-release .1', function () {
        version = '1.11.1-alpha.1';
        beforeEachIt();

        ghostVersionUtils.full.should.eql(version);
        ghostVersionUtils.original.should.eql(version);
        ghostVersionUtils.safe.should.eql('1.11');
    });

    it('build', function () {
        version = '1.11.1+build';
        beforeEachIt();

        ghostVersionUtils.full.should.eql('1.11.1');
        ghostVersionUtils.original.should.eql(version);
        ghostVersionUtils.safe.should.eql('1.11');
    });

    it('mixed', function () {
        version = '1.11.1-pre+build.1';
        beforeEachIt();

        ghostVersionUtils.full.should.eql('1.11.1-pre');
        ghostVersionUtils.original.should.eql(version);
        ghostVersionUtils.safe.should.eql('1.11');
    });

    it('mixed 1', function () {
        version = '1.11.1-beta.12+build.2';
        beforeEachIt();

        ghostVersionUtils.full.should.eql('1.11.1-beta.12');
        ghostVersionUtils.original.should.eql(version);
        ghostVersionUtils.safe.should.eql('1.11');
    });
});
