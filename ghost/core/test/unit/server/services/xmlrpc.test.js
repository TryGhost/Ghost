const sinon = require('sinon');
const _ = require('lodash');
const nock = require('nock');
const rewire = require('rewire');
const testUtils = require('../../../utils');
const configUtils = require('../../../utils/configUtils');
const xmlrpc = rewire('../../../../core/server/services/xmlrpc');
const events = require('../../../../core/server/lib/common/events');
const logging = require('@tryghost/logging');

describe('XMLRPC', function () {
    let eventStub;

    beforeEach(function () {
        eventStub = sinon.stub(events, 'on');
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
        const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

        const testModel = {
            toJSON: function () {
                return testPost;
            }
        };

        const pingStub = sinon.stub();
        const resetXmlRpc = xmlrpc.__set__('ping', pingStub);
        const listener = xmlrpc.__get__('listener');

        listener(testModel);

        pingStub.calledOnce.should.be.true();
        pingStub.calledWith(testPost).should.be.true();

        // Reset xmlrpc ping method
        resetXmlRpc();
    });

    it('listener() does not call ping() when importing', function () {
        const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

        const testModel = {
            toJSON: function () {
                return testPost;
            }
        };

        const pingStub = sinon.stub();
        const resetXmlRpc = xmlrpc.__set__('ping', pingStub);
        const listener = xmlrpc.__get__('listener');

        listener(testModel, {importing: true});

        pingStub.calledOnce.should.be.false();

        // Reset xmlrpc ping method
        resetXmlRpc();
    });

    describe('ping()', function () {
        const ping = xmlrpc.__get__('ping');

        it('with a post should execute two pings', function (done) {
            const ping1 = nock('http://rpc.pingomatic.com').post('/').reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            ping(testPost);

            (function retry() {
                if (ping1.isDone()) {
                    return done();
                }

                setTimeout(retry, 100);
            }());
        });

        it('with default post should not execute pings', function () {
            const ping1 = nock('http://rpc.pingomatic.com').post('/').reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            testPost.slug = 'welcome';

            ping(testPost);

            ping1.isDone().should.be.false();
        });

        it('with a page should not execute pings', function () {
            const ping1 = nock('http://rpc.pingomatic.com').post('/').reply(200);
            const testPage = _.clone(testUtils.DataGenerator.Content.posts[5]);

            ping(testPage);

            ping1.isDone().should.be.false();
        });

        it('when privacy.useRpcPing is false should not execute pings', function () {
            const ping1 = nock('http://rpc.pingomatic.com').post('/').reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            configUtils.set({privacy: {useRpcPing: false}});

            ping(testPost);

            ping1.isDone().should.be.false();
        });

        it('captures && logs errors from requests', function (done) {
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);
            const ping1 = nock('http://rpc.pingomatic.com').post('/').reply(400);
            const loggingStub = sinon.stub(logging, 'error');

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
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            const ping1 = nock('http://rpc.pingomatic.com').post('/').reply(200,
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
             </methodResponse>`);

            const loggingStub = sinon.stub(logging, 'error');

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
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            const ping1 = nock('http://rpc.pingomatic.com').post('/').reply(200,
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
             </methodResponse>`).replace('\n', ''));

            const loggingStub = sinon.stub(logging, 'error');

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
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            const ping1 = nock('http://rpc.pingomatic.com').post('/').reply(200,
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
                </methodResponse>`);

            const loggingStub = sinon.stub(logging, 'error');

            ping(testPost);

            (function retry() {
                if (ping1.isDone()) {
                    loggingStub.calledOnce.should.eql(false);
                    return done();
                }

                setTimeout(retry, 100);
            }());
        });

        it('should behave correctly when getting a 429', function (done) {
            const ping1 = nock('http://rpc.pingomatic.com').post('/').reply(429);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            ping(testPost);

            (function retry() {
                if (ping1.isDone()) {
                    return done();
                }

                setTimeout(retry, 100);
            }());
        });
    });
});
