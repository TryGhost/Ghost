import {isEmailOnly, isPublishedOnly, isPublishedAndEmailed, getPostMetricsToDisplay} from '../../../src/utils/post-helpers';
import {Post} from '../../../src/api/posts';

describe('post-helpers', () => {
    describe('isEmailOnly', () => {
        it('returns true for email-only posts with sent status', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                email_only: true,
                status: 'sent'
            };
            expect(isEmailOnly(post)).toBe(true);
        });

        it('returns false for email-only posts with published status', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                email_only: true,
                status: 'published'
            };
            expect(isEmailOnly(post)).toBe(false);
        });

        it('returns false for non-email-only posts with sent status', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                email_only: false,
                status: 'sent'
            };
            expect(isEmailOnly(post)).toBe(false);
        });

        it('returns false when email_only is undefined', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'sent'
            };
            expect(isEmailOnly(post)).toBe(false);
        });

        it('returns false for draft posts even with email_only true', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                email_only: true,
                status: 'draft'
            };
            expect(isEmailOnly(post)).toBe(false);
        });
    });

    describe('isPublishedOnly', () => {
        it('returns true for published posts without email', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'published'
            };
            expect(isPublishedOnly(post)).toBe(true);
        });

        it('returns false for published posts with email', () => {
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
            expect(isPublishedOnly(post)).toBe(false);
        });

        it('returns true for published posts with failed email', () => {
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
            expect(isPublishedOnly(post)).toBe(true);
        });

        it('returns false for draft posts', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'draft'
            };
            expect(isPublishedOnly(post)).toBe(false);
        });

        it('returns false for sent posts', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'sent'
            };
            expect(isPublishedOnly(post)).toBe(false);
        });
    });

    describe('isPublishedAndEmailed', () => {
        it('returns true for published posts with valid email', () => {
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
            expect(isPublishedAndEmailed(post)).toBe(true);
        });

        it('returns false for published posts without email', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'published'
            };
            expect(isPublishedAndEmailed(post)).toBe(false);
        });

        it('returns false for sent posts with email', () => {
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
            expect(isPublishedAndEmailed(post)).toBe(false);
        });

        it('returns false for published posts with failed email', () => {
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
            expect(isPublishedAndEmailed(post)).toBe(false);
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
            expect(isPublishedAndEmailed(post)).toBe(true);
        });
    });

    describe('getPostMetricsToDisplay', () => {
        it('returns correct metrics for email-only posts', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                email_only: true,
                status: 'sent'
            };
            expect(getPostMetricsToDisplay(post)).toEqual({
                showEmailMetrics: true,
                showWebMetrics: false,
                showMemberGrowth: true
            });
        });

        it('returns correct metrics for published-only posts', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'published'
            };
            expect(getPostMetricsToDisplay(post)).toEqual({
                showEmailMetrics: false,
                showWebMetrics: true,
                showMemberGrowth: true
            });
        });

        it('returns correct metrics for published and emailed posts', () => {
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
            expect(getPostMetricsToDisplay(post)).toEqual({
                showEmailMetrics: true,
                showWebMetrics: true,
                showMemberGrowth: true
            });
        });

        it('returns default metrics for draft posts', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'draft'
            };
            expect(getPostMetricsToDisplay(post)).toEqual({
                showEmailMetrics: false,
                showWebMetrics: true,
                showMemberGrowth: true
            });
        });

        it('returns default metrics for scheduled posts', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'scheduled'
            };
            expect(getPostMetricsToDisplay(post)).toEqual({
                showEmailMetrics: false,
                showWebMetrics: true,
                showMemberGrowth: true
            });
        });

        it('returns default metrics for sent posts without email_only flag', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1',
                status: 'sent',
                email_only: false
            };
            expect(getPostMetricsToDisplay(post)).toEqual({
                showEmailMetrics: false,
                showWebMetrics: true,
                showMemberGrowth: true
            });
        });

        it('returns default metrics for undefined status', () => {
            const post: Post = {
                id: '1',
                url: 'http://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'uuid-1'
            };
            expect(getPostMetricsToDisplay(post)).toEqual({
                showEmailMetrics: false,
                showWebMetrics: true,
                showMemberGrowth: true
            });
        });
    });
});