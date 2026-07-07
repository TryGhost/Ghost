import {createTurnstile, TURNSTILE_API_URL} from '../../src/utils/turnstile';

describe('createTurnstile', () => {
    let fakeTurnstile;
    let renderedOptions;

    beforeEach(() => {
        renderedOptions = null;
        fakeTurnstile = {
            render: vi.fn((container, options) => {
                renderedOptions = options;
                return 'widget-1';
            }),
            execute: vi.fn(),
            reset: vi.fn(),
            remove: vi.fn()
        };
        window.turnstile = fakeTurnstile;
    });

    afterEach(() => {
        delete window.turnstile;
        document.body.innerHTML = '';
        document.head.innerHTML = '';
    });

    function getOverlay() {
        return document.querySelector('[data-testid="turnstile-overlay"]');
    }

    it('injects api.js into the document when window.turnstile is absent', async () => {
        delete window.turnstile;

        const verifier = createTurnstile({doc: document, sitekey: 'sitekey-1'});
        const tokenPromise = verifier.getToken();
        // The promise must not reject when the script later fails; attach a
        // handler before triggering the error
        const result = tokenPromise.catch(e => e);

        const script = document.head.querySelector(`script[src="${TURNSTILE_API_URL}"]`);
        expect(script).not.toBeNull();

        // jsdom doesn't fetch the script; simulate a load failure
        script.onerror();
        expect((await result).message).toMatch(/Failed to load security verification/);
    });

    it('renders an invisible widget and resolves with the token', async () => {
        const verifier = createTurnstile({doc: document, sitekey: 'sitekey-1'});
        const tokenPromise = verifier.getToken();
        await Promise.resolve();

        expect(fakeTurnstile.render).toHaveBeenCalledTimes(1);
        expect(renderedOptions.sitekey).toEqual('sitekey-1');
        expect(renderedOptions.appearance).toEqual('interaction-only');
        expect(renderedOptions.execution).toEqual('execute');
        expect(fakeTurnstile.execute).toHaveBeenCalledWith('widget-1');

        // Invisible flow: overlay exists but stays hidden
        expect(getOverlay()).not.toBeNull();
        expect(getOverlay().style.display).toEqual('none');

        renderedOptions.callback('tok-123');
        await expect(tokenPromise).resolves.toEqual('tok-123');
    });

    it('shows the overlay only while Cloudflare requires interaction', async () => {
        const verifier = createTurnstile({doc: document, sitekey: 'sitekey-1'});
        const tokenPromise = verifier.getToken();
        await Promise.resolve();

        expect(getOverlay().style.display).toEqual('none');

        renderedOptions['before-interactive-callback']();
        expect(getOverlay().style.display).toEqual('flex');

        renderedOptions['after-interactive-callback']();
        expect(getOverlay().style.display).toEqual('none');

        renderedOptions.callback('tok-123');
        await expect(tokenPromise).resolves.toEqual('tok-123');
    });

    it('hides the overlay and rejects when verification fails', async () => {
        const verifier = createTurnstile({doc: document, sitekey: 'sitekey-1'});
        const tokenPromise = verifier.getToken();
        await Promise.resolve();

        renderedOptions['before-interactive-callback']();
        renderedOptions['error-callback']();

        expect(getOverlay().style.display).toEqual('none');
        await expect(tokenPromise).rejects.toThrow(/Security verification failed/);
    });

    it('rejects when the token expires', async () => {
        const verifier = createTurnstile({doc: document, sitekey: 'sitekey-1'});
        const tokenPromise = verifier.getToken();
        await Promise.resolve();

        renderedOptions['expired-callback']();
        await expect(tokenPromise).rejects.toThrow(/Security verification expired/);
    });

    it('resets the widget between uses so each token is fresh', async () => {
        const verifier = createTurnstile({doc: document, sitekey: 'sitekey-1'});

        const first = verifier.getToken();
        await Promise.resolve();
        renderedOptions.callback('tok-1');
        await expect(first).resolves.toEqual('tok-1');

        const second = verifier.getToken();
        await Promise.resolve();
        expect(fakeTurnstile.render).toHaveBeenCalledTimes(1);
        expect(fakeTurnstile.reset).toHaveBeenCalledWith('widget-1');
        expect(fakeTurnstile.execute).toHaveBeenCalledTimes(2);

        renderedOptions.callback('tok-2');
        await expect(second).resolves.toEqual('tok-2');
    });

    it('returns the in-flight promise when getToken is called concurrently', async () => {
        const verifier = createTurnstile({doc: document, sitekey: 'sitekey-1'});

        const first = verifier.getToken();
        await Promise.resolve();
        const second = verifier.getToken();
        await Promise.resolve();

        expect(fakeTurnstile.execute).toHaveBeenCalledTimes(1);

        renderedOptions.callback('tok-1');
        await expect(first).resolves.toEqual('tok-1');
        await expect(second).resolves.toEqual('tok-1');
    });

    it('destroy removes the widget and overlay and rejects any pending request', async () => {
        const verifier = createTurnstile({doc: document, sitekey: 'sitekey-1'});
        const tokenPromise = verifier.getToken();
        await Promise.resolve();

        verifier.destroy();

        await expect(tokenPromise).rejects.toThrow(/Security verification cancelled/);
        expect(fakeTurnstile.remove).toHaveBeenCalledWith('widget-1');
        expect(getOverlay()).toBeNull();
    });
});
