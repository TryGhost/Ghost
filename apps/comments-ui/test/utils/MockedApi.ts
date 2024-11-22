import nql from '@tryghost/nql';
import {buildComment, buildMember, buildReply, buildSettings} from './fixtures';

// The test file doesn't run in the browser, so we can't use the DOM API.
// We can use a simple regex to strip HTML tags from a string for test purposes.
const htmlToPlaintext = (html) => {
    return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
};

export class MockedApi {
    comments: any[];
    postId: string;
    member: any;
    settings: any;
    members: any[];
    delay: number;

    #lastCommentDate = new Date('2021-01-01T00:00:00.000Z');

    #findReplyById(id: string) {
        return this.comments.flatMap(c => c.replies).find(r => r.id === id);
    }

    constructor({postId = 'ABC', comments = [], member = undefined, settings = {}, members = []}: {postId?: string, comments?: any[], member?: any, settings?: any, members?: any[]}) {
        this.postId = postId;
        this.comments = comments;
        this.member = member;
        this.settings = settings;
        this.members = [];
        this.delay = 0;
    }

    setDelay(delay: number) {
        this.delay = delay;
    }

    addComment(overrides: any = {}) {
        if (!overrides.created_at) {
            overrides.created_at = this.#lastCommentDate.toISOString();
            this.#lastCommentDate = new Date(this.#lastCommentDate.getTime() + 1);
        }

        const inReplyTo = overrides.in_reply_to_id && this.#findReplyById(overrides.in_reply_to_id);
        if (inReplyTo) {
            overrides.in_reply_to_snippet = htmlToPlaintext(inReplyTo.html);
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

    createMember(overrides) {
        const newMember = buildMember(overrides);
        this.members.push(newMember);
        return newMember;
    }

    setMember(overrides) {
        this.member = buildMember(overrides);
    }

    logoutMember() {
        this.member = null;
    }

    setSettings(overrides) {
        this.settings = buildSettings(overrides);
    }

    commentsCounts() {
        return {
            [this.postId]: this.comments.length
        };
    }

    browseComments({limit = 5, filter, page, order}: {limit?: number, filter?: string, page: number, order?: string}) {
        // Sort comments on created at + id
        const setOrder = order || 'default';

        if (setOrder === 'count__likes desc, created_at desc') {
            // Sort by likes (desc) first, then by created_at (asc)
            this.comments.sort((a, b) => {
                const likesDiff = b.count.likes - a.count.likes;
                if (likesDiff !== 0) {
                    return likesDiff;
                } // Prioritize by likes

                const aDate = new Date(a.created_at).getTime();
                const bDate = new Date(b.created_at).getTime();
                return aDate - bDate; // For the rest, sort by date asc
            });
        }

        if (setOrder === 'created_at desc') {
            // Sort by created_at (newest first)
            this.comments.sort((a, b) => {
                const aDate = new Date(a.created_at).getTime();
                const bDate = new Date(b.created_at).getTime();
                return bDate - aDate; // Newest first
            });
        }

        if (setOrder === 'created_at asc') {
            // Sort by created_at (oldest first)
            this.comments.sort((a, b) => {
                const aDate = new Date(a.created_at).getTime();
                const bDate = new Date(b.created_at).getTime();
                return aDate - bDate; // Oldest first
            });
        }

        if (setOrder === 'default') {
            this.comments.sort((a, b) => {
                const aDate = new Date(a.created_at).getTime();
                const bDate = new Date(b.created_at).getTime();

                if (aDate === bDate) {
                    return a.id > b.id ? -1 : 1;
                }

                return aDate > bDate ? -1 : 1;
            });
        }

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

    async #delayResponse() {
        await new Promise((resolve) => {
            (setTimeout(resolve, this.delay));
        });
    }

    async listen({page, path}: {page: any, path: string}) {
        await page.route(`${path}/members/api/member/`, async (route) => {
            await this.#delayResponse();
            if (!this.member) {
                return await route.fulfill({
                    status: 401,
                    body: 'Not authenticated'
                });
            }

            if (route.request().method() === 'PUT') {
                const payload = JSON.parse(route.request().postData());
                this.member = {
                    ...this.member,
                    ...payload
                };
            }

            await route.fulfill({
                status: 200,
                body: JSON.stringify(this.member)
            });
        });

        await page.route(`${path}/members/api/comments/*`, async (route) => {
            await this.#delayResponse();
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
        });

        await page.route(`${path}/members/api/comments/post/*/*`, async (route) => {
            await this.#delayResponse();
            const url = new URL(route.request().url());

            const p = parseInt(url.searchParams.get('page') ?? '1');
            const limit = parseInt(url.searchParams.get('limit') ?? '5');
            const filter = url.searchParams.get('filter') ?? '';
            const order = url.searchParams.get('order') ?? '';
            await route.fulfill({
                status: 200,
                body: JSON.stringify(this.browseComments({
                    page: p,
                    limit,
                    filter,
                    order
                }))
            });
        });

        // LIKE a single comment
        await page.route(`${path}/members/api/comments/*/like/`, async (route) => {
            await this.#delayResponse();
            const url = new URL(route.request().url());
            const commentId = url.pathname.split('/').reverse()[2];

            const comment = this.comments.find(c => c.id === commentId);
            if (!comment) {
                return await route.fulfill({
                    status: 404,
                    body: 'Comment not found'
                });
            }

            if (route.request().method() === 'POST') {
                comment.count.likes += 1;
                comment.liked = true;
            }

            if (route.request().method() === 'DELETE') {
                comment.count.likes -= 1;
                comment.liked = false;
            }

            await route.fulfill({
                status: 200,
                body: JSON.stringify(this.browseComments({
                    limit: 1,
                    filter: `id:'${commentId}'`,
                    page: 1,
                    order: ''
                }))
            });
        });

        // GET a single comment
        await page.route(`${path}/members/api/comments/*/`, async (route) => {
            await this.#delayResponse();
            const url = new URL(route.request().url());
            const commentId = url.pathname.split('/').reverse()[1];

            await route.fulfill({
                status: 200,
                body: JSON.stringify(this.browseComments({
                    limit: 1,
                    filter: `id:'${commentId}'`,
                    page: 1,
                    order: ''
                }))
            });
        });

        await page.route(`${path}/members/api/comments/*/replies/*`, async (route) => {
            await this.#delayResponse();
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
            await this.#delayResponse();
            await route.fulfill({
                status: 200,
                body: JSON.stringify(
                    this.commentsCounts()
                )
            });
        });

        // get settings from content api

        await page.route(`${path}/settings/*`, async (route) => {
            await this.#delayResponse();
            await route.fulfill({
                status: 200,
                body: JSON.stringify(this.settings)
            });
        });
    }
}
