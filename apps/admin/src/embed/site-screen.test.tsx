import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import SiteScreen from './site-screen';

const {mockUseBrowseConfig, mockUseLocation} = vi.hoisted(() => ({
    mockUseBrowseConfig: vi.fn(),
    mockUseLocation: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework', () => ({
    useLocation: mockUseLocation
}));

vi.mock('@tryghost/admin-x-framework/api/site', () => ({
    useBrowseSite: mockUseBrowseConfig
}));

describe('SiteScreen', () => {
    beforeEach(() => {
        mockUseBrowseConfig.mockReturnValue({
            data: {site: {url: 'https://example.com'}}
        });
        mockUseLocation.mockReturnValue({key: 'nav-key-1'});
    });

    it('renders the site iframe with admin params and the navigation guid', () => {
        render(<SiteScreen />);

        const iframe = screen.getByTestId('site-frame');
        expect(iframe).toHaveAttribute('src', 'https://example.com/?v=nav-key-1&admin=1&admin_toolbar=0');
        expect(iframe).toHaveAttribute('title', 'Site');
    });

    it('changes the iframe src when navigation produces a new location key', () => {
        const {rerender} = render(<SiteScreen />);

        mockUseLocation.mockReturnValue({key: 'nav-key-2'});
        rerender(<SiteScreen />);

        expect(screen.getByTestId('site-frame'))
            .toHaveAttribute('src', 'https://example.com/?v=nav-key-2&admin=1&admin_toolbar=0');
    });

    it('renders nothing while the config is loading', () => {
        mockUseBrowseConfig.mockReturnValue({data: undefined});

        const {container} = render(<SiteScreen />);

        expect(container).toBeEmptyDOMElement();
    });
});
