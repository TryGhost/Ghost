// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from 'vitest';

import {setupFirstPromoter} from './first-promoter';
import type {MemberState, SiteState} from '../types';

const SCRIPT_SELECTOR = 'script[src="https://cdn.firstpromoter.com/fprom.js"]';

function makeSite(overrides: Partial<SiteState> = {}): SiteState {
    return {
        title: 'Test Site',
        url: 'https://blog.example.com',
        locale: 'en',
        firstpromoter_account: 'fp123',
        ...overrides
    };
}

function makeMember(createdAt?: string): MemberState {
    return {
        id: 'm1',
        uuid: 'uuid-1',
        email: 'jamie@example.com',
        status: 'free',
        created_at: createdAt
    };
}

function findScript(): HTMLScriptElement | null {
    return document.querySelector(SCRIPT_SELECTOR);
}

function fireLoad(): void {
    findScript()?.dispatchEvent(new Event('load'));
}

describe('setupFirstPromoter', () => {
    afterEach(() => {
        findScript()?.remove();
        delete window.$FPROM;
        delete window._fprom;
    });

    it('does nothing when the site has no firstpromoter_account', () => {
        setupFirstPromoter({site: makeSite({firstpromoter_account: undefined}), member: null});

        expect(findScript()).toBeNull();
    });

    it('injects fprom.js and inits against the dot-prefixed root domain', () => {
        const init = vi.fn();
        window.$FPROM = {init};

        setupFirstPromoter({site: makeSite(), member: null});

        const script = findScript();
        expect(script).not.toBeNull();
        expect(script?.async).toBe(true);

        fireLoad();
        expect(init).toHaveBeenCalledWith('fp123', '.example.com');
    });

    it('tracks signup for members created in the last 24 hours', () => {
        const trackSignup = vi.fn();
        window.$FPROM = {init: vi.fn(), trackSignup};
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        setupFirstPromoter({site: makeSite(), member: makeMember(oneHourAgo)});
        fireLoad();

        expect(trackSignup).toHaveBeenCalledWith({email: 'jamie@example.com', uid: 'uuid-1'});
    });

    it('does not track signup for older members', () => {
        const trackSignup = vi.fn();
        window.$FPROM = {init: vi.fn(), trackSignup};
        const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

        setupFirstPromoter({site: makeSite(), member: makeMember(twoDaysAgo)});
        fireLoad();

        expect(trackSignup).not.toHaveBeenCalled();
    });

    it('queues the signup event when $FPROM is unavailable', () => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        setupFirstPromoter({site: makeSite(), member: makeMember(oneHourAgo)});
        fireLoad();

        expect(window._fprom).toEqual([
            ['event', 'signup'],
            ['email', 'jamie@example.com'],
            ['uid', 'uuid-1']
        ]);
    });
});
