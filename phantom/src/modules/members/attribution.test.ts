import {describe, expect, it} from 'vitest';
import {resolveAttribution} from './attribution.js';

const resolvePage = async (path: string) => {
    if (path === '/test-post/') {
        return {title: 'Test Post', type: 'post'};
    }
    return null;
};

describe('member signup attribution', () => {
    it('attributes direct homepage signups', async () => {
        const result = await resolveAttribution([{time: 1, path: '/'}], resolvePage);
        expect(result.source).toBe('Direct');
        expect(result.title).toBe('homepage');
        expect(result.type).toBe('url');
    });

    it('resolves post pages and utm sources', async () => {
        const result = await resolveAttribution([
            {time: 2, path: '/test-post/', referrerSource: 'twitter'},
            {time: 1, path: '/'}
        ], resolvePage);
        expect(result.source).toBe('Twitter');
        expect(result.title).toBe('Test Post');
        expect(result.type).toBe('post');
    });

    it('derives sources from referrer urls and newsletter refs', async () => {
        const google = await resolveAttribution([
            {time: 1, path: '/test-post/', referrerUrl: 'https://www.google.com/'}
        ], resolvePage);
        expect(google.source).toBe('Google');

        const newsletter = await resolveAttribution([
            {time: 1, path: '/test-post/', referrerSource: 'ghost-newsletter'}
        ], resolvePage);
        expect(newsletter.source).toBe('ghost newsletter');
    });
});
