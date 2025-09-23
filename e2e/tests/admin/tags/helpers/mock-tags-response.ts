import {Page, Request} from '@playwright/test';

// XXX: Remove these types and the mockTagsResponse helper once we have proper
// test isolation, factories, and no longer need to mock responses.
interface Tag {
    id: string;
    name: string;
    slug: string;
    url: string;
    description: string;
    visibility?: 'public' | 'internal';
    count?: {
        posts: number;
    };
}

interface PaginatedResponse {
    meta: {
        pagination: {
            page: number;
            limit: number;
            pages: number;
            total: number;
            next?: number;
        };
    };
    tags: Tag[];
}

export async function mockTagsResponse(
    page: Page,
    handler: (request: Request) => Promise<Partial<PaginatedResponse>>
) {
    await page.route('/ghost/api/admin/tags/*', async (route, request) => {
        const tags = await handler(request);
        await route.fulfill({
            body: JSON.stringify({
                meta: {
                    ...tags.meta,
                    pagination: {
                        page: 1,
                        limit: 100,
                        pages: 1,
                        total:
                            tags.meta?.pagination?.total ??
                            tags.tags?.length ??
                            0,
                        ...tags.meta?.pagination
                    }
                },
                tags: tags.tags ?? []
            })
        });
    });
}
