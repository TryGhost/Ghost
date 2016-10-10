/*jshint expr:true*/
var should  = require('should'),
    rewire  = require('rewire'),
    sinon   = require('sinon'),
    channelConfig = require('../../../../server/controllers/frontend/channel-config').get,

    // stuff being tested
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

    describe('Tag config', function () {
        var req = {
                channelConfig: channelConfig('tag'),
                params: {}
            },
            promise = {
                then: function () {
                    return {catch: function () {}};
                }
            };

        it('should return correct tag config', function () {
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
