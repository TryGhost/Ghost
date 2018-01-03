'use strict';

// jshint unused: false
const should = require('should'),
    rewire = require('rewire'),
    testUtils = require('../../utils');

let ghostVersionUtils,
    version;

describe('Utils: Ghost Version', function () {
    const beforeEachIt = function be() {
        testUtils.mockNotExistingModule(/package\.json/, {version: version});

        ghostVersionUtils = rewire('../../../server/lib/ghost-version');
    };

    afterEach(function () {
        testUtils.unmockNotExistingModule(/package\.json/);
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
