import {hasBeenEmailed} from '../../../src/utils/post-utils';
import {Post} from '../../../src/api/posts';

describe('post-utils', () => {
    describe('hasBeenEmailed', () => {
        it('returns false for posts without email data', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'published'
            };
            expect(hasBeenEmailed(post)).toBe(false);
        });

        it('returns true for published posts with valid email data', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'published',
                email: {
                    opened_count: 10,
                    email_count: 100,
                    status: 'submitted'
                }
            };
            expect(hasBeenEmailed(post)).toBe(true);
        });

        it('returns true for sent posts with valid email data', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'sent',
                email: {
                    opened_count: 10,
                    email_count: 100,
                    status: 'submitted'
                }
            };
            expect(hasBeenEmailed(post)).toBe(true);
        });

        it('returns false for draft posts with email data', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'draft',
                email: {
                    opened_count: 0,
                    email_count: 0,
                    status: 'pending'
                }
            };
            expect(hasBeenEmailed(post)).toBe(false);
        });

        it('returns false for published posts with failed email status', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'published',
                email: {
                    opened_count: 0,
                    email_count: 0,
                    status: 'failed'
                }
            };
            expect(hasBeenEmailed(post)).toBe(false);
        });

        it('returns true for published posts with failed status but positive email_count', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'published',
                email: {
                    opened_count: 50,
                    email_count: 100,
                    status: 'failed'
                }
            };
            expect(hasBeenEmailed(post)).toBe(true);
        });

        it('returns true for posts with email data but no status field', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'published',
                email: {
                    opened_count: 10,
                    email_count: 100
                }
            };
            expect(hasBeenEmailed(post)).toBe(true);
        });

        it('returns true for posts with email data but zero email_count', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'published',
                email: {
                    opened_count: 0,
                    email_count: 0
                }
            };
            expect(hasBeenEmailed(post)).toBe(true);
        });

        it('handles posts with undefined status', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                email: {
                    opened_count: 10,
                    email_count: 100
                }
            };
            expect(hasBeenEmailed(post)).toBe(false);
        });

        it('handles posts with null email object', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'published',
                email: null as any
            };
            expect(hasBeenEmailed(post)).toBe(false);
        });

        it('handles posts with email object but missing email_count', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'published',
                email: {
                    opened_count: 10
                } as any
            };
            expect(hasBeenEmailed(post)).toBe(true);
        });

        it('returns false for scheduled posts with email data', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'scheduled',
                email: {
                    opened_count: 0,
                    email_count: 100,
                    status: 'pending'
                }
            };
            expect(hasBeenEmailed(post)).toBe(false);
        });

        it('handles edge case with negative email_count', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'published',
                email: {
                    opened_count: 0,
                    email_count: -1,
                    status: 'submitted'
                }
            };
            expect(hasBeenEmailed(post)).toBe(true);
        });

        it('handles edge case with string email_count', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'published',
                email: {
                    opened_count: 0,
                    email_count: '100' as any,
                    status: 'submitted'
                }
            };
            expect(hasBeenEmailed(post)).toBe(true);
        });
    });
});