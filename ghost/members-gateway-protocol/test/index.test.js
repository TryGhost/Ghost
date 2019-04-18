// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const JSDOM = require('jsdom').JSDOM;
const gatewayProtocol = require('../');

const origin = 'https://sauce.net';
const dom = new JSDOM(`
    <iframe src="${origin}"></iframe>
`);
const window = global.window = dom.window;
const document = global.document = dom.window.document;

const postMessage = data => window.dispatchEvent(new window.MessageEvent('message', {
    origin,
    data
}));

describe('@tryghost/members-gateway-protocol', function () {
    it('exports a function', function () {
        should.equal(typeof gatewayProtocol, 'function');
    });
    describe('gatewayProtocol: (frame: IFrame) -> {call: Function, listen: Function}', function () {
        it('returns an object with call and listen methods', function () {
            const iframe = document.body.querySelector('iframe');
            const protocol = gatewayProtocol(iframe);
            should.equal(typeof protocol.call, 'function');
            should.equal(typeof protocol.listen, 'function');
        });

        describe('listen: (listener: (event: Object) -> void) -> listening: Boolean', function () {
            it('attaches a single listener to messages posted to the window from the frame', function (done) {
                const iframe = document.body.querySelector('iframe');
                const protocol = gatewayProtocol(iframe);
                const firstListening = protocol.listen(function ({event, payload}) {
                    should.equal(event, 'event-name');
                    should.equal(payload, 'payload-data');
                    done();
                });
                const secondListening = protocol.listen(function () {
                    done(should.fail());
                });
                should.equal(firstListening, true);
                should.equal(secondListening, false);
                postMessage({event: 'event-name', payload: 'payload-data'});
            });
        });

        describe('call: (method: String, options: Object, callback: (err: Error, data: Object) -> void) -> void', function () {
            it('calls a method on the iframe, and handles the result through callback', function (done) {
                const iframe = document.body.querySelector('iframe');
                const protocol = gatewayProtocol(iframe);

                iframe.contentWindow.addEventListener('message', function (event) {
                    if (event.data.method === 'someMethod') {
                        return postMessage({
                            uid: event.data.uid,
                            error: null,
                            data: event.data.options.toJoin.join('-')
                        });
                    }
                });

                protocol.call('someMethod', {toJoin: ['some', 'data']}, function (err, result) {
                    should.equal(err, null);
                    should.equal(result, 'some-data');
                    done();
                });
            });
        });
    });
});
