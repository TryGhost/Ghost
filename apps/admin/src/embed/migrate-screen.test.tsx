import {render, screen} from '@testing-library/react';
import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import MigrateScreen from './migrate-screen';

const {
    mockCrossShellNavigate,
    mockNavigate,
    mockUseBrowseConfig,
    mockUseBrowseIntegrations,
    mockUseBrowseSettings,
    mockUseCurrentUser,
    mockUseParams
} = vi.hoisted(() => ({
    mockCrossShellNavigate: vi.fn(),
    mockNavigate: vi.fn(),
    mockUseBrowseConfig: vi.fn(),
    mockUseBrowseIntegrations: vi.fn(),
    mockUseBrowseSettings: vi.fn(),
    mockUseCurrentUser: vi.fn(),
    mockUseParams: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework', () => ({
    useNavigate: () => mockNavigate,
    useParams: mockUseParams
}));

vi.mock('@tryghost/admin-x-framework/api/config', () => ({
    useBrowseConfig: mockUseBrowseConfig
}));

vi.mock('@tryghost/admin-x-framework/api/current-user', () => ({
    useCurrentUser: mockUseCurrentUser
}));

vi.mock('@tryghost/admin-x-framework/api/integrations', () => ({
    useBrowseIntegrations: mockUseBrowseIntegrations
}));

vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
    useBrowseSettings: mockUseBrowseSettings,
    getSettingValue: () => null
}));

vi.mock('@tryghost/admin-x-framework/api/users', () => ({
    hasAdminAccess: (user: {roles: Array<{name: string}>}) => user.roles.some(role => ['Owner', 'Administrator'].includes(role.name)),
    isOwnerUser: (user: {roles: Array<{name: string}>}) => user.roles.some(role => role.name === 'Owner')
}));

vi.mock('@tryghost/shade/components', () => ({
    Button: ({children, ...props}: React.ComponentProps<'button'>) => React.createElement('button', props, children)
}));

vi.mock('@tryghost/shade/utils', () => ({
    LucideIcon: new Proxy({}, {get: () => () => null})
}));

vi.mock('@/utils/cross-shell-navigate', () => ({
    crossShellNavigate: mockCrossShellNavigate
}));

describe('MigrateScreen', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseParams.mockReturnValue({'*': ''});
        mockUseBrowseConfig.mockReturnValue({data: {config: {version: '6.0'}}});
        mockUseBrowseIntegrations.mockReturnValue({data: {integrations: []}});
        mockUseBrowseSettings.mockReturnValue({data: {settings: []}});
        mockUseCurrentUser.mockReturnValue({
            data: {id: '1', email: 'admin@example.com', roles: [{name: 'Administrator'}]}
        });
    });

    it('renders the migration iframe for administrators', () => {
        render(<MigrateScreen />);

        expect(screen.getByTestId('migrate-frame')).toHaveAttribute('src', 'https://migrate.ghost.org');
        expect(mockCrossShellNavigate).not.toHaveBeenCalled();
    });

    it('preselects the platform from the sub route', () => {
        mockUseParams.mockReturnValue({'*': 'wordpress'});

        render(<MigrateScreen />);

        expect(screen.getByTestId('migrate-frame'))
            .toHaveAttribute('src', 'https://migrate.ghost.org?platform=wordpress');
    });

    it('redirects non-admin users home', () => {
        mockUseCurrentUser.mockReturnValue({
            data: {id: '2', email: 'editor@example.com', roles: [{name: 'Editor'}]}
        });

        const {container} = render(<MigrateScreen />);

        expect(mockCrossShellNavigate).toHaveBeenCalledWith('/', {replace: true});
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing while the current user is loading', () => {
        mockUseCurrentUser.mockReturnValue({data: undefined});

        const {container} = render(<MigrateScreen />);

        expect(container).toBeEmptyDOMElement();
        expect(mockCrossShellNavigate).not.toHaveBeenCalled();
    });

    it('navigates to migration settings when closed', () => {
        render(<MigrateScreen />);

        screen.getByTestId('close-migrate').click();

        expect(mockNavigate).toHaveBeenCalledWith('/settings/migration');
    });
});
