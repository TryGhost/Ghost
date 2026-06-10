import {render, screen} from '@testing-library/react';
import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import ExploreScreen from './explore-screen';

const {
    mockNavigate,
    mockUseBrowseIntegrations,
    mockUseParams,
    mockUseUserPreferences
} = vi.hoisted(() => ({
    mockNavigate: vi.fn(),
    mockUseBrowseIntegrations: vi.fn(),
    mockUseParams: vi.fn(),
    mockUseUserPreferences: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework', () => ({
    useNavigate: () => mockNavigate,
    useParams: mockUseParams
}));

vi.mock('@tryghost/admin-x-framework/api/integrations', () => ({
    useBrowseIntegrations: mockUseBrowseIntegrations
}));

vi.mock('@tryghost/shade/components', () => ({
    Button: ({children, ...props}: React.ComponentProps<'button'>) => React.createElement('button', props, children)
}));

vi.mock('@tryghost/shade/utils', () => ({
    LucideIcon: new Proxy({}, {get: () => () => null})
}));

vi.mock('@/hooks/user-preferences', () => ({
    useUserPreferences: mockUseUserPreferences
}));

vi.mock('@/utils/cross-shell-navigate', () => ({
    crossShellNavigate: vi.fn()
}));

describe('ExploreScreen', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseParams.mockReturnValue({'*': ''});
        mockUseUserPreferences.mockReturnValue({data: {nightShift: false}});
        mockUseBrowseIntegrations.mockReturnValue({
            data: {
                integrations: [{
                    id: '1',
                    slug: 'ghost-explore',
                    api_keys: [{id: 'k1', type: 'admin', secret: 'explore-admin-key'}]
                }]
            }
        });
    });

    it('renders the explore iframe at the root url', () => {
        render(<ExploreScreen />);

        const iframe = screen.getByTestId('explore-frame');
        expect(iframe).toHaveAttribute('src', 'https://ghost.org/explore/');
        expect(iframe).not.toHaveClass('hidden');
        expect(screen.queryByTestId('explore-connect')).not.toBeInTheDocument();
    });

    it('appends sub paths to the iframe src', () => {
        mockUseParams.mockReturnValue({'*': 'tag/news'});

        render(<ExploreScreen />);

        expect(screen.getByTestId('explore-frame'))
            .toHaveAttribute('src', 'https://ghost.org/explore/tag/news');
    });

    it('shows the connect screen (and hides the iframe) on /explore/connect', () => {
        mockUseParams.mockReturnValue({'*': 'connect'});

        render(<ExploreScreen />);

        // connect is admin-rendered: never used as the iframe src
        expect(screen.getByTestId('explore-frame')).toHaveAttribute('src', 'https://ghost.org/explore/');
        expect(screen.getByTestId('explore-frame')).toHaveClass('hidden');
        expect(screen.getByTestId('explore-connect')).toBeInTheDocument();
        // the permission summary shows the site API URL that will be shared
        expect(screen.getByTestId('explore-api-url')).toHaveTextContent(window.location.host);
        expect(screen.getByTestId('submit-explore')).not.toBeDisabled();
    });

    it('disables the connect button until the explore integration token is loaded', () => {
        mockUseParams.mockReturnValue({'*': 'connect'});
        mockUseBrowseIntegrations.mockReturnValue({data: undefined});

        render(<ExploreScreen />);

        expect(screen.getByTestId('submit-explore')).toBeDisabled();
    });
});
