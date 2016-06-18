/*jshint expr:true*/
var should  = require('should'),
    rewire  = require('rewire'),
    sinon   = require('sinon'),
    channelConfig = require('../../../../server/controllers/frontend/channel-config').get,

    // stuff being tested
    labs    = require('../../../../server/utils/labs'),
    renderChannel = rewire('../../../../server/controllers/frontend/render-channel'),

    sandbox = sinon.sandbox.create(),
    originalFetchData;

// stop jshint complaining
should.equal(true, true);

describe('Render Channel', function () {
    beforeEach(function () {
        originalFetchData = renderChannel.__get__('fetchData');
    });

    afterEach(function () {
        sandbox.restore();

        renderChannel.__set__('fetchData', originalFetchData);
    });

    describe('internal tags labs flag', function () {
        var req = {
                channelConfig: channelConfig('tag'),
                params: {}
            },
            promise = {
                then: function () {
                    return {catch: function () {}};
                }
            };

        it('should return normal tag config if labs flag is not set', function () {
            sandbox.stub(labs, 'isSet').returns(false);

            renderChannel.__set__('fetchData', function (channelOpts) {
                channelOpts.name.should.eql('tag');
                channelOpts.postOptions.filter.should.eql('tags:\'%s\'');
                channelOpts.data.tag.options.should.eql({slug: '%s'});

                return promise;
            });

            renderChannel(req);
        });

        it('should return new tag config if labs flag is set', function () {
            sandbox.stub(labs, 'isSet').returns(true);

            renderChannel.__set__('fetchData', function (channelOpts) {
                channelOpts.name.should.eql('tag');
                channelOpts.postOptions.filter.should.eql('tags:\'%s\'+tags.visibility:\'public\'');
                channelOpts.data.tag.options.should.eql({slug: '%s', visibility: 'public'});

                return promise;
            });

            renderChannel(req);
        });
    });
});
