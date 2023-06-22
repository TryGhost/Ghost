import nql from '@tryghost/nql';
import {buildComment, buildMember} from './fixtures';

export class MockedApi {
    comments: any[];
    postId: string;
    member: any;

    #lastCommentDate = new Date('2021-01-01T00:00:00.000Z');

    constructor({postId = 'ABC', comments = [], member = undefined}: {postId?: string, comments?: any[], member?: any}) {
        this.postId = postId;
        this.comments = comments;
        this.member = member;
    }

    addComment(overrides: any = {}) {
        if (!overrides.created_at) {
            overrides.created_at = this.#lastCommentDate.toISOString();
            this.#lastCommentDate = new Date(this.#lastCommentDate.getTime() + 1);
        }

        const fixture = buildComment({
            ...overrides,
            post_id: this.postId
        });
        this.comments.push(fixture);
    }

    addComments(count, overrides = {}) {
        for (let i = 0; i < count; i += 1) {
            this.addComment(overrides);
        }
    }

    setMember(overrides) {
        this.member = buildMember(overrides);
    }

    commentsCounts() {
        return {
            [this.postId]: this.comments.length
        };
    }

    browseComments({limit = 5, order, filter, page}: {limit?: number, order?: string, filter?: string, page: number}) {
        // Sort comments on created at + id
        this.comments.sort((a, b) => {
            const aDate = new Date(a.created_at).getTime();
            const bDate = new Date(b.created_at).getTime();

            if (aDate === bDate) {
                return a.id > b.id ? 1 : -1;
            }

            return aDate > bDate ? 1 : -1;
        });

        let filteredComments = this.comments;

        // Parse NQL filter
        if (filter) {
            const parsed = nql(filter);
            filteredComments = this.comments.filter((comment) => {
                return parsed.queryJSON(comment);
            });
        }

        // Splice based on page and limit
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const comments = filteredComments.slice(startIndex, endIndex);

        return {
            comments,
            meta: {
                pagination: {
                    pages: Math.ceil(filteredComments.length / limit),
                    total: filteredComments.length,
                    page,
                    limit
                }
            }
        };
    }

    async listen({page, path}: {page: any, path: string}) {
        await page.route(`${path}/members/api/member/`, async (route) => {
            if (!this.member) {
                return await route.fulfill({
                    status: 401,
                    body: 'Not authenticated'
                });
            }

            await route.fulfill({
                status: 200,
                body: JSON.stringify(this.member)
            });
        });

        await page.route(`${path}/members/api/comments/*`, async (route) => {
            const url = new URL(route.request().url());

            const p = parseInt(url.searchParams.get('page') ?? '1');
            const limit = parseInt(url.searchParams.get('limit') ?? '5');
            const order = url.searchParams.get('order') ?? '';

            await route.fulfill({
                status: 200,
                body: JSON.stringify(this.browseComments({
                    page: p,
                    limit,
                    order
                }))
            });
        });

        await page.route(`${path}/members/api/comments/counts/*`, async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify(
                    this.commentsCounts()
                )
            });
        });
    }
}
