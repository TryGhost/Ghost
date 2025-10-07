import {renderHook} from '@testing-library/react';
import {usePermission} from '../../../src/hooks/usePermissions';
import {User} from '../../../src/api/users';

// Mock the currentUser API
vi.mock('../../../src/api/currentUser', () => ({
    useCurrentUser: vi.fn()
}));

import {useCurrentUser} from '../../../src/api/currentUser';

const mockUseCurrentUser = useCurrentUser as any;

const createMockUser = (roles: {name: string; id: string}[]): User => ({
    id: '1',
    name: 'Test User',
    slug: 'test-user',
    email: 'test@example.com',
    profile_image: null,
    cover_image: null,
    bio: null,
    website: null,
    location: null,
    facebook: null,
    twitter: null,
    threads: null,
    bluesky: null,
    mastodon: null,
    tiktok: null,
    youtube: null,
    instagram: null,
    linkedin: null,
    accessibility: null,
    status: 'active',
    meta_title: null,
    meta_description: null,
    tour: null,
    last_seen: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    comment_notifications: false,
    free_member_signup_notification: false,
    paid_subscription_canceled_notification: false,
    paid_subscription_started_notification: false,
    mention_notifications: false,
    recommendation_notifications: false,
    milestone_notifications: false,
    donation_notifications: false,
    roles,
    url: 'https://example.com/author/test-user'
});

describe('usePermission', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseCurrentUser.mockReturnValue({data: null, isLoading: false});
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    it('returns false when current user is not loaded', () => {
        mockUseCurrentUser.mockReturnValue({
            data: null
        });

        const {result} = renderHook(() => usePermission(['Administrator']));

        expect(result.current).toBe(false);
    });

    it('returns false when current user has no roles', () => {
        const user = createMockUser([]);
        mockUseCurrentUser.mockReturnValue({
            data: user
        });

        const {result} = renderHook(() => usePermission(['Administrator']));

        expect(result.current).toBe(false);
    });

    it('returns true when user has required role', () => {
        const user = createMockUser([
            {name: 'Administrator', id: '1'},
            {name: 'Editor', id: '2'}
        ]);
        mockUseCurrentUser.mockReturnValue({
            data: user
        });

        const {result} = renderHook(() => usePermission(['Administrator']));

        expect(result.current).toBe(true);
    });

    it('returns true when user has one of multiple required roles', () => {
        const user = createMockUser([
            {name: 'Editor', id: '2'},
            {name: 'Author', id: '3'}
        ]);
        mockUseCurrentUser.mockReturnValue({
            data: user
        });

        const {result} = renderHook(() => usePermission(['Administrator', 'Editor', 'Owner']));

        expect(result.current).toBe(true);
    });

    it('returns false when user does not have any required roles', () => {
        const user = createMockUser([
            {name: 'Contributor', id: '4'},
            {name: 'Author', id: '3'}
        ]);
        mockUseCurrentUser.mockReturnValue({
            data: user
        });

        const {result} = renderHook(() => usePermission(['Administrator', 'Editor', 'Owner']));

        expect(result.current).toBe(false);
    });

    it('handles empty required roles array', () => {
        const user = createMockUser([
            {name: 'Administrator', id: '1'}
        ]);
        mockUseCurrentUser.mockReturnValue({
            data: user
        });

        const {result} = renderHook(() => usePermission([]));

        expect(result.current).toBe(false);
    });

    it('handles case sensitivity correctly', () => {
        const user = createMockUser([
            {name: 'Admin', id: '1'}
        ]);
        mockUseCurrentUser.mockReturnValue({
            data: user
        });

        const {result} = renderHook(() => usePermission(['admin']));

        expect(result.current).toBe(false); // Case sensitive match
    });

    it('returns false when current user data is undefined', () => {
        mockUseCurrentUser.mockReturnValue({
            data: undefined
        });

        const {result} = renderHook(() => usePermission(['Administrator']));

        expect(result.current).toBe(false);
    });

    it('handles multiple role checks with complex role structure', () => {
        const user = createMockUser([
            {name: 'Owner', id: '1'},
            {name: 'Administrator', id: '2'}
        ]);
        mockUseCurrentUser.mockReturnValue({
            data: user
        });

        const {result} = renderHook(() => usePermission(['Owner']));

        expect(result.current).toBe(true);
    });

    it('handles user with single role correctly', () => {
        const user = createMockUser([
            {name: 'Author', id: '3'}
        ]);
        mockUseCurrentUser.mockReturnValue({
            data: user
        });

        const {result} = renderHook(() => usePermission(['Author']));

        expect(result.current).toBe(true);
    });
});