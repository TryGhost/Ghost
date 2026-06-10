import Debug from '@src/views/PostAnalytics/Debug/debug';
import {Post} from '@tryghost/admin-x-framework/api/posts';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

const mocks = vi.hoisted(() => ({
    useBrowsePosts: vi.fn(),
    useCurrentUser: vi.fn()
}));

// the tabs pull in the full email debug UI; the permission guards under test
// live in the Debug screen itself
vi.mock('@src/views/PostAnalytics/Debug/debug-tabs', () => ({
    default: () => <div data-testid="debug-tabs" />
}));

vi.mock('@tryghost/admin-x-framework', () => ({
    Link: ({children}: {children?: React.ReactNode}) => <a href="#">{children}</a>,
    hasBeenEmailed: () => false,
    useNavigate: () => vi.fn(),
    useParams: () => ({postId: 'post-1'})
}));

vi.mock('@tryghost/admin-x-framework/api/posts', () => ({
    useBrowsePosts: mocks.useBrowsePosts
}));

vi.mock('@tryghost/admin-x-framework/api/current-user', () => ({
    useCurrentUser: mocks.useCurrentUser
}));

vi.mock('@tryghost/admin-x-framework/api/users', () => ({
    isAuthorOrContributor: (user: {roles?: Array<{name: string}>}) => user.roles?.some(role => ['Author', 'Contributor'].includes(role.name)) ?? false,
    isContributorUser: (user: {roles?: Array<{name: string}>}) => user.roles?.some(role => role.name === 'Contributor') ?? false
}));

vi.mock('@tryghost/admin-x-framework/api/emails', () => ({
    getEmail: () => ({data: undefined}),
    getEmailBatches: () => ({data: undefined}),
    getEmailRecipientFailures: () => ({data: undefined}),
    getEmailAnalyticsStatus: () => ({data: undefined}),
    useScheduleEmailAnalytics: () => ({mutateAsync: vi.fn()}),
    useCancelScheduledEmailAnalytics: () => ({mutateAsync: vi.fn()})
}));

vi.mock('@tryghost/admin-x-framework/hooks', () => ({
    useHandleError: () => vi.fn()
}));

function mockUser(roleName: string) {
    mocks.useCurrentUser.mockReturnValue({
        data: {id: 'user-1', roles: [{name: roleName}]}
    });
}

function mockPost(overrides: Partial<Post> = {}) {
    mocks.useBrowsePosts.mockReturnValue({
        isLoading: false,
        data: {
            posts: [{
                id: 'post-1',
                title: 'Debugged post',
                status: 'published',
                published_at: '2026-01-01T10:00:00.000Z',
                authors: [{id: 'user-1'}],
                ...overrides
            }]
        }
    });
}

describe('Debug', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hash = '';
        mockUser('Administrator');
        mockPost();
    });

    it('renders the debug screen for administrators', () => {
        render(<Debug />);

        expect(screen.getByTestId('post-debug')).toBeInTheDocument();
        expect(window.location.hash).toBe('');
    });

    it('redirects authors away from posts they do not own via a real hash navigation', () => {
        // the posts list may be Ember-owned (postsListX off): a router
        // <Navigate> would pushState without a hashchange and the parked
        // Ember shell would never wake — the redirect must change the
        // location hash for both routers to observe it
        mockUser('Author');
        mockPost({authors: [{id: 'someone-else'}] as Post['authors']});

        render(<Debug />);

        expect(window.location.hash).toBe('#/posts');
        expect(screen.queryByTestId('post-debug')).not.toBeInTheDocument();
    });

    it('lets authors debug their own posts', () => {
        mockUser('Author');

        render(<Debug />);

        expect(screen.getByTestId('post-debug')).toBeInTheDocument();
        expect(window.location.hash).toBe('');
    });

    it('redirects contributors away from non-draft posts', () => {
        mockUser('Contributor');
        mockPost({status: 'published'});

        render(<Debug />);

        expect(window.location.hash).toBe('#/posts');
        expect(screen.queryByTestId('post-debug')).not.toBeInTheDocument();
    });

    it('lets contributors debug their own drafts', () => {
        mockUser('Contributor');
        mockPost({status: 'draft'});

        render(<Debug />);

        expect(screen.getByTestId('post-debug')).toBeInTheDocument();
        expect(window.location.hash).toBe('');
    });
});
