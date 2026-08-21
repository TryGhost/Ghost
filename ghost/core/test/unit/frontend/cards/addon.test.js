const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');

const runtime = fs.readFileSync(path.join(__dirname, '../../../../core/frontend/src/addon-blocks/addon-blocks.js'), 'utf8');

describe('Add-on public card runtime', function () {
    let dom;

    afterEach(function () {
        dom?.window.close();
    });

    it('accepts lifecycle messages only from the matching add-on frame', function () {
        assert.match(runtime, /navigationTokens/);

        dom = new JSDOM(`
            <!doctype html><html><body>
                <figure class="kg-card kg-addon-card" data-addon-id="episode-player-1">
                    <iframe class="kg-addon-card-frame" height="240"></iframe>
                </figure>
                <iframe class="untrusted-frame"></iframe>
            </body></html>
        `, {
            runScripts: 'dangerously',
            url: 'https://publisher.example/post/'
        });
        const card = dom.window.document.querySelector('.kg-addon-card');
        const frame = card.querySelector('.kg-addon-card-frame');
        const untrustedFrame = dom.window.document.querySelector('.untrusted-frame');
        const hostMessages = [];
        frame.contentWindow.postMessage = message => hostMessages.push(message);
        dom.window.eval(runtime);

        assert.equal(hostMessages[0].type, 'ghost-addon-host');
        assert.equal(hostMessages[0].instanceId, 'episode-player-1');
        assert.equal(hostMessages[0].action, 'connect');

        dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
            data: {type: 'ghost-addon', instanceId: 'episode-player-1', action: 'resize', height: 50_000},
            source: untrustedFrame.contentWindow
        }));
        assert.equal(frame.getAttribute('height'), '240');

        dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
            data: {type: 'ghost-addon', instanceId: 'episode-player-1', action: 'resize', height: 50_000},
            source: frame.contentWindow
        }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
            data: {type: 'ghost-addon', instanceId: 'episode-player-1', action: 'ready', navigationToken: 'a'.repeat(32)},
            source: frame.contentWindow
        }));

        dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
            data: {type: 'ghost-addon', instanceId: 'episode-player-1', action: 'navigate', navigationToken: 'forged', href: '#forged'},
            source: frame.contentWindow
        }));
        assert.equal(dom.window.location.hash, '');

        dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
            data: {type: 'ghost-addon', instanceId: 'episode-player-1', action: 'navigate', navigationToken: 'a'.repeat(32), href: '#episode'},
            source: frame.contentWindow
        }));

        assert.equal(frame.getAttribute('height'), '20000');
        assert.equal(frame.style.height, '20000px');
        assert.equal(card.dataset.addonReady, 'true');
        assert.equal(dom.window.location.hash, '#episode');
        const connectionMessage = hostMessages.at(-1);
        assert.equal(connectionMessage.type, 'ghost-addon-host');
        assert.equal(connectionMessage.instanceId, 'episode-player-1');
        assert.equal(connectionMessage.action, 'connected');
    });
});
