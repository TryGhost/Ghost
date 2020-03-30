var should = require('should'),
    sinon = require('sinon'),
    _ = require('lodash'),
    nock = require('nock'),
    http = require('http'),
    rewire = require('rewire'),
    testUtils = require('../../utils'),
    configUtils = require('../../utils/configUtils'),
    xmlrpc = rewire('../../../core/server/services/xmlrpc'),
    common = require('../../../core/server/lib/common');

describe('XMLRPC', function () {
    var eventStub;

    beforeEach(function () {
        eventStub = sinon.stub(common.events, 'on');
        configUtils.set('privacy:useRpcPing', true);
    });

    afterEach(function () {
        sinon.restore();
        configUtils.restore();
        nock.cleanAll();
    });

    it('listen() should initialise event correctly', function () {
        xmlrpc.listen();
        eventStub.calledOnce.should.be.true();
        eventStub.calledWith('post.published', xmlrpc.__get__('listener')).should.be.true();
    });

    it('listener() calls ping() with toJSONified model', function () {
        var testPost = _.clone(testUtils.DataGenerator.Content.posts[2]),
            testModel = {
                toJSON: function () {
                    return testPost;
                }
            },
            pingStub = sinon.stub(),
            resetXmlRpc = xmlrpc.__set__('ping', pingStub),
            listener = xmlrpc.__get__('listener');

        listener(testModel);

        pingStub.calledOnce.should.be.true();
        pingStub.calledWith(testPost).should.be.true();

        // Reset xmlrpc ping method
        resetXmlRpc();
    });

    it('listener() does not call ping() when importing', function () {
        var testPost = _.clone(testUtils.DataGenerator.Content.posts[2]),
            testModel = {
                toJSON: function () {
                    return testPost;
                }
            },
            pingStub = sinon.stub(),
            resetXmlRpc = xmlrpc.__set__('ping', pingStub),
            listener = xmlrpc.__get__('listener');

        listener(testModel, {importing: true});

        pingStub.calledOnce.should.be.false();

        // Reset xmlrpc ping method
        resetXmlRpc();
    });

    describe('ping()', function () {
        var ping = xmlrpc.__get__('ping');

        it('with a post should execute two pings', function (done) {
            var ping1 = nock('http://rpc.pingomatic.com').post('/').reply(200),
                testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            ping(testPost);

            (function retry() {
                if (ping1.isDone()) {
                    return done();
                }

                setTimeout(retry, 100);
            }());
        });

        it('with default post should not execute pings', function () {
            var ping1 = nock('http://rpc.pingomatic.com').post('/').reply(200),
                testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            testPost.slug = 'welcome';

            ping(testPost);

            ping1.isDone().should.be.false();
        });

        it('with a page should not execute pings', function () {
            var ping1 = nock('http://rpc.pingomatic.com').post('/').reply(200),
                testPage = _.clone(testUtils.DataGenerator.Content.posts[5]);

            ping(testPage);

            ping1.isDone().should.be.false();
        });

        it('when privacy.useRpcPing is false should not execute pings', function () {
            var ping1 = nock('http://rpc.pingomatic.com').post('/').reply(200),
                testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            configUtils.set({privacy: {useRpcPing: false}});

            ping(testPost);

            ping1.isDone().should.be.false();
        });

        it('captures && logs errors from requests', function (done) {
            var testPost = _.clone(testUtils.DataGenerator.Content.posts[2]),
                ping1 = nock('http://rpc.pingomatic.com').post('/').reply(400),
                loggingStub = sinon.stub(common.logging, 'error');

            ping(testPost);

            (function retry() {
                if (ping1.isDone()) {
                    loggingStub.calledOnce.should.eql(true);
                    loggingStub.args[0][0].message.should.containEql('Response code 400');
                    return done();
                }

                setTimeout(retry, 100);
            }());
        });

        it('captures && logs XML errors from requests with newlines between tags', function (done) {
            var testPost = _.clone(testUtils.DataGenerator.Content.posts[2]),
                ping1 = nock('http://rpc.pingomatic.com').post('/').reply(200,
                    `<?xml version="1.0"?>
                 <methodResponse>
                   <params>
                     <param>
                       <value>
                         <struct>
                           <member>
                             <name>flerror</name>
                             <value>
                               <boolean>1</boolean>
                             </value>
                           </member>
                           <member>
                             <name>message</name>
                             <value>
                              <string>Uh oh. A wee lil error.</string>
                             </value>
                           </member>
                         </struct>
                       </value>
                     </param>
                   </params>
                 </methodResponse>`),
                loggingStub = sinon.stub(common.logging, 'error');

            ping(testPost);

            (function retry() {
                if (ping1.isDone()) {
                    loggingStub.calledOnce.should.eql(true);
                    loggingStub.args[0][0].message.should.equal('Uh oh. A wee lil error.');
                    return done();
                }

                setTimeout(retry, 100);
            }());
        });

        it('captures && logs XML errors from requests without newlines between tags', function (done) {
            var testPost = _.clone(testUtils.DataGenerator.Content.posts[2]),
                ping1 = nock('http://rpc.pingomatic.com').post('/').reply(200,
                    (`<?xml version="1.0"?>
                 <methodResponse>
                   <params>
                     <param>
                       <value>
                         <struct>
                           <member>
                             <name>flerror</name>
                             <value>
                               <boolean>1</boolean>
                             </value>
                           </member>
                           <member>
                             <name>message</name>
                             <value>
                              <string>Uh oh. A wee lil error.</string>
                             </value>
                           </member>
                         </struct>
                       </value>
                     </param>
                   </params>
                 </methodResponse>`).replace('\n', '')),
                loggingStub = sinon.stub(common.logging, 'error');

            ping(testPost);

            (function retry() {
                if (ping1.isDone()) {
                    loggingStub.calledOnce.should.eql(true);
                    loggingStub.args[0][0].message.should.equal('Uh oh. A wee lil error.');
                    return done();
                }

                setTimeout(retry, 100);
            }());
        });

        it('does not error with responses that have 0 as flerror value', function (done) {
            var testPost = _.clone(testUtils.DataGenerator.Content.posts[2]),
                ping1 = nock('http://rpc.pingomatic.com').post('/').reply(200,
                    `<?xml version="1.0"?>
                    <methodResponse>
                      <params>
                        <param>
                          <value>
                            <struct>
                              <member><name>flerror</name><value><boolean>0</boolean></value></member>
                              <member><name>message</name><value><string>Pings being forwarded to 9 services!</string></value></member>
                    </struct>
                          </value>
                        </param>
                      </params>
                    </methodResponse>`),
                loggingStub = sinon.stub(common.logging, 'error');

            ping(testPost);

            (function retry() {
                if (ping1.isDone()) {
                    loggingStub.calledOnce.should.eql(false);
                    return done();
                }

                setTimeout(retry, 100);
            }());
        });
    });
});
