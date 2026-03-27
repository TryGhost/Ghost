const assert = require('node:assert/strict');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const {createBrowserEnvironment, loadScript} = require('../../../utils/browser-test-utils');

describe('private.js', function () {
    let env;
    let scriptContent;

    const defaultConfig = {
        accessDialogSelector: '#access',
        footerLinksSelector: '.gh-private-trigger-wrap',
        successResetDelay: 1000,
        invalidEmailMessage: 'Please enter a valid email address',
        genericErrorMessage: 'Something went wrong, please try again.',
        confirmEmailMessage: 'Thanks! Now check your email to confirm.',
        subscriptionConfirmedMessage: 'Subscription confirmed!',
        restrictedDomainMessage: 'Signups from this email domain are currently restricted.',
        tooManyAttemptsMessage: 'Too many sign-up attempts, try again later'
    };

    function getHtml(configOverrides = {}) {
        const config = {...defaultConfig, ...configOverrides};

        return `<!DOCTYPE html>
        <html>
            <body>
                <form class="gh-private-signup-form gh-signin" data-ghost-private-subscribe-form data-members-form="subscribe" data-site-url="https://example.com" data-state="idle" novalidate="novalidate">
                    <div class="gh-private-signup-fields">
                        <input class="gh-input gh-private-signup-input" type="email" value="" data-members-email>
                        <input type="hidden" data-members-label value="Gold">
                        <input type="hidden" data-members-newsletter value="weekly">
                        <input data-members-name value=" Jamie Larsen ">
                        <button class="gh-btn gh-private-signup-btn" type="submit">Subscribe</button>
                    </div>
                    <p class="gh-private-signup-feedback" data-ghost-private-subscribe-feedback data-state="idle" aria-live="polite"></p>
                </form>
                <dialog class="gh-private-dialog" id="access" aria-labelledby="private-access-title">
                    <button type="button" data-ghost-private-close>Close</button>
                    <input class="gh-input" type="password">
                </dialog>
                <div class="gh-private-trigger-wrap">
                    <a class="gh-private-trigger" href="#access" data-ghost-private-trigger>Enter access code</a>
                </div>
                <script id="gh-private-config" type="application/json">${JSON.stringify(config)}</script>
            </body>
        </html>`;
    }

    function setupEnvironment({url = 'https://example.com/private/', configOverrides = {}, withDialogSupport = true} = {}) {
        env = createBrowserEnvironment({
            url,
            html: getHtml(configOverrides)
        });

        const dialog = env.document.querySelector('#access');

        if (withDialogSupport) {
            dialog.showModal = function () {
                this.open = true;
            };

            dialog.close = function () {
                this.open = false;
            };
        }

        env.window.fetch = sinon.stub();
        env.window.console = {
            error: sinon.stub(),
            warn: sinon.stub()
        };
    }

    async function flushAsyncWork() {
        await Promise.resolve();
        await new Promise((resolve) => {
            setImmediate(resolve);
        });
    }

    before(function () {
        scriptContent = fs.readFileSync(path.join(__dirname, '../../../../core/frontend/public/private.js'), 'utf8');
    });

    afterEach(function () {
        sinon.restore();

        if (env) {
            env.dom.window.close();
            env = null;
        }
    });

    it('applies the success notification from the URL and clears the query string', function () {
        setupEnvironment({url: 'https://example.com/private/?action=signup&success=true'});

        const replaceState = sinon.spy();
        const setTimeoutStub = sinon.stub(env.window, 'setTimeout').returns(1);

        env.window.history.replaceState = replaceState;

        loadScript(env, scriptContent);

        const form = env.document.querySelector('[data-ghost-private-subscribe-form]');
        const feedback = env.document.querySelector('[data-ghost-private-subscribe-feedback]');

        assert.equal(form.dataset.state, 'success');
        assert.equal(feedback.dataset.state, 'success');
        assert.equal(feedback.textContent, 'Subscription confirmed!');
        sinon.assert.calledOnce(setTimeoutStub);
        sinon.assert.calledOnce(replaceState);
        assert.equal(replaceState.firstCall.args[2], '/private/');
    });

    it('submits the subscribe request using the expected payload shape', async function () {
        setupEnvironment();

        env.window.fetch.onFirstCall().resolves({
            ok: true,
            text: async () => 'integrity-token'
        });
        env.window.fetch.onSecondCall().resolves({
            ok: true
        });

        env.window.sessionStorage.setItem('ghost-history', JSON.stringify([{path: '/welcome', refSource: 'ghost'}]));

        loadScript(env, scriptContent);

        const form = env.document.querySelector('[data-ghost-private-subscribe-form]');
        const emailInput = env.document.querySelector('input[data-members-email]');
        const feedback = env.document.querySelector('[data-ghost-private-subscribe-feedback]');

        emailInput.value = ' jamie@example.com ';
        emailInput.checkValidity = () => true;

        form.dispatchEvent(new env.window.Event('submit', {bubbles: true, cancelable: true}));
        await flushAsyncWork();

        sinon.assert.calledTwice(env.window.fetch);
        assert.equal(env.window.fetch.firstCall.args[0], 'https://example.com/members/api/integrity-token/');
        assert.equal(env.window.fetch.firstCall.args[1].method, 'GET');

        const [requestUrl, requestOptions] = env.window.fetch.secondCall.args;
        const requestBody = JSON.parse(requestOptions.body);

        assert.equal(requestUrl, 'https://example.com/members/api/send-magic-link/');
        assert.equal(requestOptions.method, 'POST');
        assert.equal(requestOptions.headers['Content-Type'], 'application/json');
        assert.deepEqual(requestBody, {
            email: 'jamie@example.com',
            emailType: 'subscribe',
            labels: ['Gold'],
            name: 'Jamie Larsen',
            autoRedirect: true,
            urlHistory: [{path: '/welcome', refSource: 'ghost'}],
            newsletters: [{name: 'weekly'}],
            integrityToken: 'integrity-token'
        });
        assert.equal(form.dataset.state, 'success');
        assert.equal(feedback.dataset.state, 'idle');
        assert.equal(feedback.textContent, 'Thanks! Now check your email to confirm.');
        assert.equal(emailInput.value, '');
    });

    it('normalizes known API validation errors before showing feedback', async function () {
        setupEnvironment();

        env.window.fetch.onFirstCall().resolves({
            ok: true,
            text: async () => 'integrity-token'
        });
        env.window.fetch.onSecondCall().resolves({
            ok: false,
            json: async () => ({
                errors: [{message: 'email is not valid', type: 'ValidationError'}]
            })
        });

        loadScript(env, scriptContent);

        const form = env.document.querySelector('[data-ghost-private-subscribe-form]');
        const emailInput = env.document.querySelector('input[data-members-email]');
        const feedback = env.document.querySelector('[data-ghost-private-subscribe-feedback]');

        emailInput.value = 'bad-email';
        emailInput.checkValidity = () => true;

        form.dispatchEvent(new env.window.Event('submit', {bubbles: true, cancelable: true}));
        await flushAsyncWork();

        assert.equal(form.dataset.state, 'idle');
        assert.equal(feedback.dataset.state, 'error');
        assert.equal(feedback.textContent, 'Please enter a valid email address');
    });

    it('normalizes rate-limit errors by type rather than exact message', async function () {
        setupEnvironment();

        env.window.fetch.onFirstCall().resolves({
            ok: true,
            text: async () => 'integrity-token'
        });
        env.window.fetch.onSecondCall().resolves({
            ok: false,
            json: async () => ({
                errors: [{message: 'Too many sign-in attempts try again in 14 minutes', type: 'TooManyRequestsError'}]
            })
        });

        loadScript(env, scriptContent);

        const form = env.document.querySelector('[data-ghost-private-subscribe-form]');
        const emailInput = env.document.querySelector('input[data-members-email]');
        const feedback = env.document.querySelector('[data-ghost-private-subscribe-feedback]');

        emailInput.value = 'jamie@example.com';
        emailInput.checkValidity = () => true;

        form.dispatchEvent(new env.window.Event('submit', {bubbles: true, cancelable: true}));
        await flushAsyncWork();

        assert.equal(feedback.textContent, 'Too many sign-up attempts, try again later');
    });

    it('normalizes restricted domain errors by keyword rather than exact message', async function () {
        setupEnvironment();

        env.window.fetch.onFirstCall().resolves({
            ok: true,
            text: async () => 'integrity-token'
        });
        env.window.fetch.onSecondCall().resolves({
            ok: false,
            json: async () => ({
                errors: [{message: 'Signups from this email domain are currently restricted.', type: 'BadRequestError'}]
            })
        });

        loadScript(env, scriptContent);

        const form = env.document.querySelector('[data-ghost-private-subscribe-form]');
        const emailInput = env.document.querySelector('input[data-members-email]');
        const feedback = env.document.querySelector('[data-ghost-private-subscribe-feedback]');

        emailInput.value = 'jamie@blocked.com';
        emailInput.checkValidity = () => true;

        form.dispatchEvent(new env.window.Event('submit', {bubbles: true, cancelable: true}));
        await flushAsyncWork();

        assert.equal(feedback.textContent, 'Signups from this email domain are currently restricted.');
    });

    it('trims whitespace from email before validation', async function () {
        setupEnvironment();

        env.window.fetch.onFirstCall().resolves({
            ok: true,
            text: async () => 'integrity-token'
        });
        env.window.fetch.onSecondCall().resolves({
            ok: true
        });

        loadScript(env, scriptContent);

        const form = env.document.querySelector('[data-ghost-private-subscribe-form]');
        const emailInput = env.document.querySelector('input[data-members-email]');

        emailInput.value = '  jamie@example.com  ';
        emailInput.checkValidity = function () {
            // After trim, value should already be clean when checkValidity is called
            assert.equal(this.value, 'jamie@example.com', 'email should be trimmed before checkValidity');
            return true;
        };

        form.dispatchEvent(new env.window.Event('submit', {bubbles: true, cancelable: true}));
        await flushAsyncWork();

        // Verify the trimmed email is sent in the request body
        const requestBody = JSON.parse(env.window.fetch.secondCall.args[1].body);
        assert.equal(requestBody.email, 'jamie@example.com');
    });

    it('shows invalid email feedback when client-side validation fails', async function () {
        setupEnvironment();

        loadScript(env, scriptContent);

        const form = env.document.querySelector('[data-ghost-private-subscribe-form]');
        const emailInput = env.document.querySelector('input[data-members-email]');
        const feedback = env.document.querySelector('[data-ghost-private-subscribe-feedback]');

        emailInput.value = 'not-an-email';
        emailInput.checkValidity = () => false;

        form.dispatchEvent(new env.window.Event('submit', {bubbles: true, cancelable: true}));
        await flushAsyncWork();

        // Should not make any fetch calls
        sinon.assert.notCalled(env.window.fetch);
        assert.equal(form.dataset.state, 'idle');
        assert.equal(feedback.dataset.state, 'error');
        assert.equal(feedback.textContent, 'Please enter a valid email address');
    });

    it('shows generic error when network request throws', async function () {
        setupEnvironment();

        env.window.fetch.rejects(new Error('Failed to fetch'));

        loadScript(env, scriptContent);

        const form = env.document.querySelector('[data-ghost-private-subscribe-form]');
        const emailInput = env.document.querySelector('input[data-members-email]');
        const feedback = env.document.querySelector('[data-ghost-private-subscribe-feedback]');

        emailInput.value = 'jamie@example.com';
        emailInput.checkValidity = () => true;

        form.dispatchEvent(new env.window.Event('submit', {bubbles: true, cancelable: true}));
        await flushAsyncWork();

        assert.equal(form.dataset.state, 'idle');
        assert.equal(feedback.dataset.state, 'error');
        assert.equal(feedback.textContent, 'Something went wrong, please try again.');
    });

    it('shows generic error when error response body is not JSON', async function () {
        setupEnvironment();

        env.window.fetch.onFirstCall().resolves({
            ok: true,
            text: async () => 'integrity-token'
        });
        env.window.fetch.onSecondCall().resolves({
            ok: false,
            json: async () => {
                throw new SyntaxError('Unexpected token');
            }
        });

        loadScript(env, scriptContent);

        const form = env.document.querySelector('[data-ghost-private-subscribe-form]');
        const emailInput = env.document.querySelector('input[data-members-email]');
        const feedback = env.document.querySelector('[data-ghost-private-subscribe-feedback]');

        emailInput.value = 'jamie@example.com';
        emailInput.checkValidity = () => true;

        form.dispatchEvent(new env.window.Event('submit', {bubbles: true, cancelable: true}));
        await flushAsyncWork();

        assert.equal(form.dataset.state, 'idle');
        assert.equal(feedback.dataset.state, 'error');
        assert.equal(feedback.textContent, 'Something went wrong, please try again.');
    });

    it('shows generic error when integrity token fetch fails', async function () {
        setupEnvironment();

        env.window.fetch.onFirstCall().resolves({
            ok: false,
            status: 500,
            text: async () => 'Internal Server Error'
        });

        loadScript(env, scriptContent);

        const form = env.document.querySelector('[data-ghost-private-subscribe-form]');
        const emailInput = env.document.querySelector('input[data-members-email]');
        const feedback = env.document.querySelector('[data-ghost-private-subscribe-feedback]');

        emailInput.value = 'jamie@example.com';
        emailInput.checkValidity = () => true;

        form.dispatchEvent(new env.window.Event('submit', {bubbles: true, cancelable: true}));
        await flushAsyncWork();

        sinon.assert.calledOnce(env.window.fetch);
        assert.equal(form.dataset.state, 'idle');
        assert.equal(feedback.dataset.state, 'error');
        assert.equal(feedback.textContent, 'Something went wrong, please try again.');
    });

    it('falls back to inline dialog rendering when showModal is unavailable', function () {
        setupEnvironment({withDialogSupport: false});

        loadScript(env, scriptContent);

        const dialog = env.document.querySelector('#access');
        const footer = env.document.querySelector('.gh-private-trigger-wrap');

        assert.equal(dialog.classList.contains('gh-private-dialog-fallback'), true);
        assert.equal(dialog.hasAttribute('open'), true);
        assert.equal(footer.hidden, true);
    });
});
