import {renderHook} from '@testing-library/react';
import {usePermission} from '../../../src/hooks/usePermissions';

// Mock the currentUser API
vi.mock('../../../src/api/currentUser', () => ({
    useCurrentUser: vi.fn()
}));

import {useCurrentUser} from '../../../src/api/currentUser';

const mockUseCurrentUser = useCurrentUser as any;

describe('usePermissions', () => {
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

        const {result} = renderHook(() => usePermission(['admin']));

        expect(result.current).toBe(false);
    });

    it('returns false when current user has no roles', () => {
        mockUseCurrentUser.mockReturnValue({
            data: {
                id: '1',
                name: 'Test User',
                roles: []
            }
        });

        const {result} = renderHook(() => usePermission(['admin']));

        expect(result.current).toBe(false);
    });

    it('returns true when user has required role', () => {
        mockUseCurrentUser.mockReturnValue({
            data: {
                id: '1',
                name: 'Test User',
                roles: [
                    {name: 'admin', id: '1'},
                    {name: 'editor', id: '2'}
                ]
            }
        });

        const {result} = renderHook(() => usePermission(['admin']));

        expect(result.current).toBe(true);
    });

    it('returns true when user has one of multiple required roles', () => {
        mockUseCurrentUser.mockReturnValue({
            data: {
                id: '1',
                name: 'Test User',
                roles: [
                    {name: 'editor', id: '2'},
                    {name: 'author', id: '3'}
                ]
            }
        });

        const {result} = renderHook(() => usePermission(['admin', 'editor', 'owner']));

        expect(result.current).toBe(true);
    });

    it('returns false when user does not have any required roles', () => {
        mockUseCurrentUser.mockReturnValue({
            data: {
                id: '1',
                name: 'Test User',
                roles: [
                    {name: 'contributor', id: '4'},
                    {name: 'author', id: '3'}
                ]
            }
        });

        const {result} = renderHook(() => usePermission(['admin', 'editor', 'owner']));

        expect(result.current).toBe(false);
    });

    it('handles empty required roles array', () => {
        mockUseCurrentUser.mockReturnValue({
            data: {
                id: '1',
                name: 'Test User',
                roles: [
                    {name: 'admin', id: '1'}
                ]
            }
        });

        const {result} = renderHook(() => usePermission([]));

        expect(result.current).toBe(false);
    });

    it('handles case sensitivity correctly', () => {
        mockUseCurrentUser.mockReturnValue({
            data: {
                id: '1',
                name: 'Test User',
                roles: [
                    {name: 'Admin', id: '1'}
                ]
            }
        });

        const {result} = renderHook(() => usePermission(['admin']));

        expect(result.current).toBe(false); // Case sensitive match
    });

    it('returns false when current user data is undefined', () => {
        mockUseCurrentUser.mockReturnValue({
            data: undefined
        });

        const {result} = renderHook(() => usePermission(['admin']));

        expect(result.current).toBe(false);
    });

    it('handles multiple role checks with complex role structure', () => {
        mockUseCurrentUser.mockReturnValue({
            data: {
                id: '1',
                name: 'Test User',
                roles: [
                    {name: 'owner', id: '1', description: 'Site owner'},
                    {name: 'administrator', id: '2', description: 'Site admin'}
                ]
            }
        });

        const {result} = renderHook(() => usePermission(['owner']));

        expect(result.current).toBe(true);
    });

    it('handles user with single role correctly', () => {
        mockUseCurrentUser.mockReturnValue({
            data: {
                id: '1',
                name: 'Test User',
                roles: [
                    {name: 'author', id: '3'}
                ]
            }
        });

        const {result} = renderHook(() => usePermission(['author']));

        expect(result.current).toBe(true);
    });
});