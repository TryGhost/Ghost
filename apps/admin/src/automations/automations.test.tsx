import Automations from './automations';
import {MemoryRouter} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

const {mockUseBrowseAutomations, mockUseBrowseSettings, mockUseBrowseConfig, mockUseCurrentUser} = vi.hoisted(() => ({
    mockUseBrowseAutomations: vi.fn(),
    mockUseBrowseSettings: vi.fn(),
    mockUseBrowseConfig: vi.fn(),
    mockUseCurrentUser: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework/api/automations', async () => {
    const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/api/automations')>(
        '@tryghost/admin-x-framework/api/automations'
    );
    return {
        ...actual,
        useBrowseAutomations: mockUseBrowseAutomations
    };
});

vi.mock('@tryghost/admin-x-framework/api/settings', async () => {
    const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/api/settings')>(
        '@tryghost/admin-x-framework/api/settings'
    );
    return {
        ...actual,
        useBrowseSettings: mockUseBrowseSettings
    };
});

vi.mock('@tryghost/admin-x-framework/api/config', async () => {
    const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/api/config')>(
        '@tryghost/admin-x-framework/api/config'
    );
    return {
        ...actual,
        useBrowseConfig: mockUseBrowseConfig
    };
});

vi.mock('@tryghost/admin-x-framework/api/current-user', async () => {
    const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/api/current-user')>(
        '@tryghost/admin-x-framework/api/current-user'
    );
    return {
        ...actual,
        useCurrentUser: mockUseCurrentUser
    };
});

vi.mock('@tryghost/admin-x-framework', async () => {
    const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework')>(
        '@tryghost/admin-x-framework'
    );
    return {
        ...actual,
        getFeaturebaseToken: () => ({data: undefined}),
        useFeaturebase: () => ({isAvailable: false, openFeedbackWidget: () => {}, preloadFeedbackWidget: () => {}})
    };
});

const automations = [{
    id: 'automation-id-1',
    name: 'Free member welcome flow',
    slug: 'member-welcome-email-free',
    status: 'active' as const
}, {
    id: 'automation-id-2',
    name: 'Paid member welcome flow',
    slug: 'member-welcome-email-paid',
    status: 'inactive' as const
}];

const stripeConnectedSettings = {
    settings: [
        {key: 'stripe_connect_secret_key', value: 'sk_connect_123'},
        {key: 'stripe_connect_publishable_key', value: 'pk_connect_123'}
    ]
};

const renderPage = () => render(<MemoryRouter><Automations /></MemoryRouter>);

describe('Automations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseBrowseAutomations.mockReturnValue({data: {automations}, isError: false, isLoading: false});
        mockUseBrowseSettings.mockReturnValue({data: stripeConnectedSettings, isLoading: false});
        mockUseBrowseConfig.mockReturnValue({data: {config: {}}, isLoading: false});
        mockUseCurrentUser.mockReturnValue({data: {id: 'user-1', roles: [{name: 'Owner'}]}});
    });

    it('shows free and paid sequences when Stripe is connected', () => {
        renderPage();

        expect(screen.getByText('Free member welcome flow')).toBeInTheDocument();
        expect(screen.getByText('Paid member welcome flow')).toBeInTheDocument();
    });

    it('hides the paid sequence when Stripe is not connected', () => {
        mockUseBrowseSettings.mockReturnValue({data: {settings: []}, isLoading: false});

        renderPage();

        expect(screen.getByText('Free member welcome flow')).toBeInTheDocument();
        expect(screen.queryByText('Paid member welcome flow')).not.toBeInTheDocument();
    });

    it('hides the paid sequence when only Connect keys exist but stripeDirect is required', () => {
        mockUseBrowseConfig.mockReturnValue({data: {config: {stripeDirect: true}}, isLoading: false});

        renderPage();

        expect(screen.getByText('Free member welcome flow')).toBeInTheDocument();
        expect(screen.queryByText('Paid member welcome flow')).not.toBeInTheDocument();
    });

    it('renders the loading skeleton while automations data loads', () => {
        mockUseBrowseAutomations.mockReturnValue({data: undefined, isLoading: true});

        renderPage();

        expect(screen.getByTestId('automations-list-loading')).toBeInTheDocument();
    });

    it('renders the loading skeleton while settings load', () => {
        mockUseBrowseSettings.mockReturnValue({data: undefined, isLoading: true});

        renderPage();

        expect(screen.getByTestId('automations-list-loading')).toBeInTheDocument();
    });

    it('renders the loading skeleton while config loads', () => {
        mockUseBrowseConfig.mockReturnValue({data: undefined, isLoading: true});

        renderPage();

        expect(screen.getByTestId('automations-list-loading')).toBeInTheDocument();
    });
});
