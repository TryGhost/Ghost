import {renderHook} from '@testing-library/react';
import {UserRoleType} from '../../../src/api/roles';
import {usePermission} from '../../../src/hooks/use-permissions';

// Mock the currentUser API
vi.mock('../../../src/api/current-user', () => ({
    useCurrentUser: vi.fn()
}));

import {useCurrentUser} from '../../../src/api/current-user';

const mockUseCurrentUser = useCurrentUser as any;

describe('usePermissions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseCurrentUser.mockReturnValue({data: undefined, isLoading: false});
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    it('returns false when current user is not loaded', () => {
        mockUseCurrentUser.mockReturnValue({
            data: undefined
        });

        const {result} = renderHook(() => usePermission(['Administrator']));

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

        const {result} = renderHook(() => usePermission(['Administrator']));

        expect(result.current).toBe(false);
    });

    it('returns true when user has required role', () => {
        mockUseCurrentUser.mockReturnValue({
            data: {
                id: '1',
                name: 'Test User',
                roles: [
                    {name: 'Administrator', id: '1'},
                    {name: 'Editor', id: '2'}
                ]
            }
        });

        const {result} = renderHook(() => usePermission(['Administrator']));

        expect(result.current).toBe(true);
    });

    it('returns true when user has one of multiple required roles', () => {
        mockUseCurrentUser.mockReturnValue({
            data: {
                id: '1',
                name: 'Test User',
                roles: [
                    {name: 'Editor', id: '2'},
                    {name: 'Author', id: '3'}
                ]
            }
        });

        const {result} = renderHook(() => usePermission(['Administrator', 'Editor', 'Owner']));

        expect(result.current).toBe(true);
    });

    it('returns false when user does not have any required roles', () => {
        mockUseCurrentUser.mockReturnValue({
            data: {
                id: '1',
                name: 'Test User',
                roles: [
                    {name: 'Contributor', id: '4'},
                    {name: 'Author', id: '3'}
                ]
            }
        });

        const {result} = renderHook(() => usePermission(['Administrator', 'Editor', 'Owner']));

        expect(result.current).toBe(false);
    });

    // eslint-disable-next-line ghost/mocha/no-setup-in-describe
    it.each([
        {value: [] as UserRoleType[], description: 'empty array'},
        {value: undefined, description: 'undefined'},
        {value: null, description: 'null'}
    ])('returns true when no permissions are required ($description)', ({value}) => {
        mockUseCurrentUser.mockReturnValue({
            data: {
                id: '1',
                name: 'Test User',
                roles: [
                    {name: 'Administrator', id: '1'}
                ]
            }
        });

        const {result} = renderHook(() => usePermission(value));

        expect(result.current).toBe(true);
    });

    it('handles case sensitivity correctly', () => {
        mockUseCurrentUser.mockReturnValue({
            data: {
                id: '1',
                name: 'Test User',
                roles: [
                    {name: 'Editor', id: '1'}
                ]
            }
        });

        const {result} = renderHook(() => usePermission(['Administrator']));

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
        mockUseCurrentUser.mockReturnValue({
            data: {
                id: '1',
                name: 'Test User',
                roles: [
                    {name: 'Owner', id: '1', description: 'Site owner'},
                    {name: 'Administrator', id: '2', description: 'Site admin'}
                ]
            }
        });

        const {result} = renderHook(() => usePermission(['Owner']));

        expect(result.current).toBe(true);
    });

    it('handles user with single role correctly', () => {
        mockUseCurrentUser.mockReturnValue({
            data: {
                id: '1',
                name: 'Test User',
                roles: [
                    {name: 'Author', id: '3'}
                ]
            }
        });

        const {result} = renderHook(() => usePermission(['Author']));

        expect(result.current).toBe(true);
    });
});
