import {describe, expect, it} from 'vitest';
import {createLinkService} from './service.js';
import type {LinkRepository} from './repo.js';

const createRepository = (): LinkRepository & {state: () => {redirects: number; clicks: number}} => {
    const links: {id: string; url: string; postId: string | null; createdAt: number}[] = [];
    const redirects: {id: string}[] = [];
    const clicks: {id: string; requestId: string; linkId: string; createdAt: number}[] = [];

    return {
        createLink: async (link) => {
            const record = link as {id: string; url: string; postId: string | null; createdAt: number};
            links.push(record);
            return record;
        },
        getLinkById: async (id) => links.find((link) => link.id === id) ?? null,
        createRedirect: async (redirect) => {
            redirects.push(redirect as {id: string});
            return redirect as {id: string; linkId: string; redirectTo: string; createdAt: number};
        },
        createClick: async (click) => {
            clicks.push({
                id: click.id,
                requestId: click.requestId,
                linkId: click.linkId,
                createdAt: click.createdAt
            });
            return click as {id: string; linkId: string; requestId: string; createdAt: number};
        },
        getClickByRequest: async (requestId) => clicks.find((click) => click.requestId === requestId) ?? null,
        state: () => ({redirects: redirects.length, clicks: clicks.length})
    };
};

describe('link service', () => {
    it('creates links and bulk redirects', async () => {
        const repository = createRepository();
        const service = createLinkService(repository);

        const created = await service.createLink({url: 'https://example.com'});
        const result = await service.bulkUpdateLinks({updates: [{id: created.link.id, redirectTo: 'https://ghost.org'}]});

        expect(result.updated).toBe(1);
        expect(repository.state().redirects).toBe(1);
    });

    it('deduplicates clicks by request', async () => {
        const repository = createRepository();
        const service = createLinkService(repository);

        const created = await service.createLink({url: 'https://example.com'});
        await service.recordClick({linkId: created.link.id, requestId: 'req'});
        const second = await service.recordClick({linkId: created.link.id, requestId: 'req'});

        expect(second.recorded).toBe(false);
    });
});
