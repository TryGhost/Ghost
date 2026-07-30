import React, {lazy} from 'react';
import {FlagGatedRoute} from './flag-gated-route';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen, waitFor} from '@testing-library/react';

const {mockUseBrowseConfig} = vi.hoisted(() => ({
    mockUseBrowseConfig: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework/api/config', () => ({
    useBrowseConfig: mockUseBrowseConfig
}));

vi.mock('./ember-bridge', () => ({
    EmberFallback: () => React.createElement('div', {'data-testid': 'ember-fallback'})
}));

const ReactScreen = lazy(() => Promise.resolve({
    default: () => React.createElement('div', {'data-testid': 'react-screen'})
}));

const configResult = (overrides: Record<string, unknown>) => ({
    data: undefined,
    isError: false,
    isLoading: false,
    ...overrides
});

const withLabs = (labs: Record<string, unknown>) => configResult({data: {config: {labs}}});

describe('FlagGatedRoute', () => {
    beforeEach(() => {
        mockUseBrowseConfig.mockReset();
    });

    it('renders nothing while config is loading', () => {
        // Deliberately not falling back to Ember here: doing so would un-hide
        // the Ember shell and flash the old screen on every cold load for
        // admins who have the flag on.
        mockUseBrowseConfig.mockReturnValue(configResult({isLoading: true}));

        const {container} = render(<FlagGatedRoute component={ReactScreen} flag="someFlag" />);

        expect(screen.queryByTestId('ember-fallback')).not.toBeInTheDocument();
        expect(screen.queryByTestId('react-screen')).not.toBeInTheDocument();
        expect(container).toBeEmptyDOMElement();
    });

    it('renders Ember when the config query fails', () => {
        // A failed config read must not blank the screen — Ember owns the URL
        // by default and still serves it, so degrading to Ember keeps the
        // route working. Reporting is left to the framework's default error
        // handler on useBrowseConfig.
        mockUseBrowseConfig.mockReturnValue(configResult({isError: true, data: undefined}));

        render(<FlagGatedRoute component={ReactScreen} flag="someFlag" />);

        expect(screen.getByTestId('ember-fallback')).toBeInTheDocument();
    });

    it('renders Ember when the config query resolves with no data', () => {
        mockUseBrowseConfig.mockReturnValue(configResult({data: undefined}));

        render(<FlagGatedRoute component={ReactScreen} flag="someFlag" />);

        expect(screen.getByTestId('ember-fallback')).toBeInTheDocument();
    });

    it('renders Ember while the flag is off', () => {
        mockUseBrowseConfig.mockReturnValue(withLabs({someFlag: false}));

        render(<FlagGatedRoute component={ReactScreen} flag="someFlag" />);

        expect(screen.getByTestId('ember-fallback')).toBeInTheDocument();
    });

    it('renders Ember when the flag is absent from config', () => {
        mockUseBrowseConfig.mockReturnValue(withLabs({}));

        render(<FlagGatedRoute component={ReactScreen} flag="someFlag" />);

        expect(screen.getByTestId('ember-fallback')).toBeInTheDocument();
    });

    it('renders Ember when the flag value is truthy but not boolean true', () => {
        mockUseBrowseConfig.mockReturnValue(withLabs({someFlag: 'true'}));

        render(<FlagGatedRoute component={ReactScreen} flag="someFlag" />);

        expect(screen.getByTestId('ember-fallback')).toBeInTheDocument();
    });

    it('renders React while the flag is on', async () => {
        mockUseBrowseConfig.mockReturnValue(withLabs({someFlag: true}));

        render(<FlagGatedRoute component={ReactScreen} flag="someFlag" />);

        // The React screen is lazily imported, so it arrives a tick later.
        await waitFor(() => {
            expect(screen.getByTestId('react-screen')).toBeInTheDocument();
        });
    });
});
