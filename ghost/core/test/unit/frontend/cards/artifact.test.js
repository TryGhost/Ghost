const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');

const runtime = fs.readFileSync(path.join(__dirname, '../../../../core/frontend/src/cards/js/artifact.js'), 'utf8');

function artifactCard() {
    return `
        <figure class="kg-card kg-artifact-card" id="artifact-calculator" data-artifact-id="calculator" data-artifact-title="Calculator">
            <div class="kg-artifact-card-fallback">
                <strong class="kg-artifact-card-title">Calculator</strong>
            </div>
            <script type="application/json" class="kg-artifact-card-data">${JSON.stringify({
                id: 'calculator',
                version: 1,
                title: 'Calculator',
                description: '',
                html: '<!doctype html><html><head><title>Calculator</title></head><body><a href="https://example.com/result">Result</a></body></html>'
            }).replaceAll('<', '\\u003c')}</script>
        </figure>
    `;
}

describe('Artifact public card runtime', function () {
    let dom;

    afterEach(function () {
        dom?.window.close();
    });

    it('starts an opaque eager sandbox and adopts bounded height and ready messages', function () {
        dom = new JSDOM(`<!doctype html><html><body>${artifactCard()}</body></html>`, {
            runScripts: 'dangerously',
            url: 'https://publisher.example/post/'
        });
        dom.window.eval(runtime);

        const card = dom.window.document.querySelector('.kg-artifact-card');
        const iframe = card.querySelector('iframe');
        assert.equal(card.dataset.state, 'loading');
        assert.equal(card.querySelector('.kg-artifact-card-loading').textContent, 'Loading embed…');
        assert.equal(iframe.loading, 'eager');
        assert.equal(iframe.hidden, true);
        assert.equal(iframe.getAttribute('sandbox'), 'allow-forms allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation');
        assert.match(iframe.srcdoc, /Calculator/);
        assert.match(iframe.srcdoc, /target', '_top'/);

        dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
            data: {type: 'ghost-artifact', artifactId: 'calculator', action: 'height', height: 50_000},
            source: iframe.contentWindow
        }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
            data: {type: 'ghost-artifact', artifactId: 'calculator', action: 'ready'},
            source: iframe.contentWindow
        }));

        assert.equal(iframe.style.height, '20000px');
        assert.equal(iframe.hidden, false);
        assert.equal(card.dataset.state, 'ready');
        assert.equal(card.getAttribute('aria-busy'), 'false');
    });

    it('cleans up runtime controls when a dynamic card is removed', async function () {
        dom = new JSDOM(`<!doctype html><html><body>${artifactCard()}</body></html>`, {
            runScripts: 'dangerously',
            url: 'https://publisher.example/post/'
        });
        dom.window.eval(runtime);
        const card = dom.window.document.querySelector('.kg-artifact-card');

        card.remove();
        await new Promise((resolve) => {
            dom.window.queueMicrotask(resolve);
        });

        assert.equal(card.dataset.artifactRuntime, undefined);
        assert.equal(card.querySelector('iframe'), null);
        assert.equal(card.querySelector('.kg-artifact-card-retry'), null);
    });

    it('restarts a failed embed from the host-owned Try again action', function () {
        dom = new JSDOM(`<!doctype html><html><body>${artifactCard()}</body></html>`, {
            runScripts: 'dangerously',
            url: 'https://publisher.example/post/'
        });
        dom.window.eval(runtime);
        const card = dom.window.document.querySelector('.kg-artifact-card');
        const firstFrame = card.querySelector('iframe');

        card.querySelector('.kg-artifact-card-retry').click();

        assert.notEqual(card.querySelector('iframe'), firstFrame);
        assert.equal(card.dataset.state, 'loading');
        assert.equal(card.querySelectorAll('iframe').length, 1);
    });

    it('keeps the fallback visible after the sandbox reports a startup failure', function () {
        dom = new JSDOM(`<!doctype html><html><body>${artifactCard()}</body></html>`, {
            runScripts: 'dangerously',
            url: 'https://publisher.example/post/'
        });
        dom.window.eval(runtime);
        const card = dom.window.document.querySelector('.kg-artifact-card');
        const iframe = card.querySelector('iframe');

        dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
            data: {type: 'ghost-artifact', artifactId: 'calculator', action: 'failed'},
            source: iframe.contentWindow
        }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
            data: {type: 'ghost-artifact', artifactId: 'calculator', action: 'ready'},
            source: iframe.contentWindow
        }));

        assert.equal(card.dataset.state, 'failed');
        assert.equal(iframe.hidden, true);
        assert.equal(card.querySelector('iframe'), null);
        assert.equal(card.querySelector('.kg-artifact-card-fallback').hidden, false);
        assert.equal(card.querySelector('.kg-artifact-card-error').hidden, false);
        assert.equal(card.querySelector('.kg-artifact-card-retry').hidden, false);
    });

    it('does not treat errors after ready as startup failures', function () {
        dom = new JSDOM(`<!doctype html><html><body>${artifactCard()}</body></html>`, {
            runScripts: 'dangerously',
            url: 'https://publisher.example/post/'
        });
        dom.window.eval(runtime);
        const card = dom.window.document.querySelector('.kg-artifact-card');
        const iframe = card.querySelector('iframe');

        dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
            data: {type: 'ghost-artifact', artifactId: 'calculator', action: 'ready'},
            source: iframe.contentWindow
        }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
            data: {type: 'ghost-artifact', artifactId: 'calculator', action: 'height', height: 480},
            source: iframe.contentWindow
        }));

        assert.equal(card.dataset.state, 'ready');
        assert.equal(iframe.hidden, false);
        assert.equal(iframe.style.height, '480px');
    });

    it('keeps an invalid saved payload as a terminal static fallback', function () {
        const invalidCard = artifactCard()
            .replace('<strong class="kg-artifact-card-title">Calculator</strong>', '<p class="kg-artifact-card-error">This embed couldn’t load</p>')
            .replace('"version":1', '"version":2');
        dom = new JSDOM(`<!doctype html><html><body>${invalidCard}</body></html>`, {
            runScripts: 'dangerously',
            url: 'https://publisher.example/post/'
        });

        dom.window.eval(runtime);

        const card = dom.window.document.querySelector('.kg-artifact-card');
        assert.equal(card.dataset.state, 'failed');
        assert.equal(card.querySelectorAll('.kg-artifact-card-error').length, 1);
        assert.equal(card.querySelector('.kg-artifact-card-retry'), null);
        assert.equal(card.querySelector('iframe'), null);
    });
});
