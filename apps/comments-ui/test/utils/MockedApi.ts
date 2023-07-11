import nql from '@tryghost/nql';
import {buildComment, buildMember, buildReply} from './fixtures';

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

    buildReply(overrides: any = {}) {
        if (!overrides.created_at) {
            overrides.created_at = this.#lastCommentDate.toISOString();
            this.#lastCommentDate = new Date(this.#lastCommentDate.getTime() + 1);
        }

        return buildReply({
            ...overrides,
            post_id: this.postId
        });
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

    browseComments({limit = 5, filter, page}: {limit?: number, filter?: string, page: number}) {
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
            comments: comments.map((comment) => {
                return {
                    ...comment,
                    replies: comment.replies.slice(0, 3),
                    count: {
                        ...comment.count,
                        replies: comment.replies.length
                    }
                };
            }),
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

    browseReplies({commentId, filter, limit = 5}: {commentId: string, filter?: string, limit?: number}) {
        const comment = this.comments.find(c => c.id === commentId);
        if (!comment) {
            return {
                error: 'Comment ' + commentId + ' not found'
            };
        }

        let replies: any[] = comment.replies;

        // Sort replies on created at + id
        replies.sort((a, b) => {
            const aDate = new Date(a.created_at).getTime();
            const bDate = new Date(b.created_at).getTime();

            if (aDate === bDate) {
                return a.id > b.id ? 1 : -1;
            }

            return aDate > bDate ? 1 : -1;
        });

        // Parse NQL filter
        if (filter) {
            const parsed = nql(filter);
            replies = replies.filter((reply) => {
                return parsed.queryJSON(reply);
            });
        }

        const limitedReplies = replies.slice(0, limit);

        return {
            comments: limitedReplies,
            meta: {
                pagination: {
                    pages: Math.ceil(replies.length / limit),
                    total: replies.length,
                    page: 1,
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
            if (route.request().method() === 'POST') {
                const payload = JSON.parse(route.request().postData());

                this.#lastCommentDate = new Date();
                this.addComment({
                    ...payload.comments[0],
                    member: this.member
                });
                return await route.fulfill({
                    status: 200,
                    body: JSON.stringify({
                        comments: [
                            this.comments[this.comments.length - 1]
                        ]
                    })
                });
            }

            const url = new URL(route.request().url());

            const p = parseInt(url.searchParams.get('page') ?? '1');
            const limit = parseInt(url.searchParams.get('limit') ?? '5');
            const order = url.searchParams.get('order') ?? '';
            const filter = url.searchParams.get('filter') ?? '';

            await route.fulfill({
                status: 200,
                body: JSON.stringify(this.browseComments({
                    page: p,
                    limit,
                    order,
                    filter
                }))
            });
        });

        await page.route(`${path}/members/api/comments/*/replies/*`, async (route) => {
            const url = new URL(route.request().url());

            const limit = parseInt(url.searchParams.get('limit') ?? '5');
            const commentId = url.pathname.split('/').reverse()[2];
            const filter = url.searchParams.get('filter') ?? '';

            await route.fulfill({
                status: 200,
                body: JSON.stringify(this.browseReplies({
                    limit,
                    filter,
                    commentId
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
