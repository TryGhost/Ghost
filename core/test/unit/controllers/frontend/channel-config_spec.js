/*globals describe, afterEach, it*/
/*jshint expr:true*/
var should   = require('should'),
    sinon    = require('sinon'),

// Stuff we are testing
    labs      = require('../../../../server/utils/labs'),
    channelConfig = require('../../../../server/controllers/frontend/channel-config'),

    sandbox = sinon.sandbox.create();

describe('Channel Config', function () {
    afterEach(function () {
        sandbox.restore();
    });

    it('should get the index config', function () {
        var result = channelConfig('index');
        should.exist(result);
        result.name.should.eql('index');
    });

    it('should get the author config', function () {
        var result = channelConfig('author');
        should.exist(result);
        result.name.should.eql('author');
    });

    it('should get the tag config', function () {
        var result = channelConfig('tag');
        should.exist(result);
        result.name.should.eql('tag');
    });

    describe('hidden tags labs flag', function () {
        it('should return old tag config if labs flag is not set', function () {
            sandbox.stub(labs, 'isSet').returns(false);
            var result = channelConfig('tag');
            should.exist(result);
            result.name.should.eql('tag');
            result.postOptions.filter.should.eql('tags:%s');
            result.data.tag.options.should.eql({slug: '%s'});
        });

        it('should return new tag config if labs flag is not set', function () {
            sandbox.stub(labs, 'isSet').returns(true);
            var result = channelConfig('tag');
            should.exist(result);
            result.name.should.eql('tag');
            result.postOptions.filter.should.eql('tags:%s+tags.hidden:false');
            result.data.tag.options.should.eql({slug: '%s', hidden: false});
        });
    });
});
