import React from 'react';
import {PagesListGate, PostsListGate} from './posts-list-gate';
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

// The Ember side of these routes is EmberListWithGiftLinks rather than a bare
// EmberFallback: the Ember list's context menu opens the React gift-link modal
// over the state bridge, so that host has to stay mounted alongside Ember.
vi.mock('./gift-link-modal-host', () => ({
    EmberListWithGiftLinks: () => React.createElement('div', {'data-testid': 'ember-list-with-gift-links'})
}));

// Stand in for the real lazy route modules so the test asserts the wiring
// (which gate loads which resource) without pulling in Shade.
vi.mock('./posts/list/posts-route', () => ({
    default: () => React.createElement('div', {'data-testid': 'react-screen', 'data-resource': 'posts'})
}));

vi.mock('./posts/list/pages-route', () => ({
    default: () => React.createElement('div', {'data-testid': 'react-screen', 'data-resource': 'pages'})
}));

const configResult = (overrides: Record<string, unknown>) => ({
    data: undefined,
    isError: false,
    isLoading: false,
    ...overrides
});

const withLabs = (labs: Record<string, unknown>) => configResult({data: {config: {labs}}});

describe('posts and pages list gates', () => {
    beforeEach(() => {
        mockUseBrowseConfig.mockReset();
    });

    describe.each([
        {name: 'PostsListGate', Gate: PostsListGate, resource: 'posts'},
        {name: 'PagesListGate', Gate: PagesListGate, resource: 'pages'}
    ])('$name', ({Gate, resource}) => {
        it('renders the Ember list (with the gift-link host) while the flag is off', () => {
            mockUseBrowseConfig.mockReturnValue(withLabs({postsListReact: false}));

            render(<Gate />);

            expect(screen.getByTestId('ember-list-with-gift-links')).toBeInTheDocument();
            // A bare EmberFallback here would drop the gift-link modal host.
            expect(screen.queryByTestId('ember-fallback')).not.toBeInTheDocument();
        });

        it('renders the Ember list when the flag is absent', () => {
            mockUseBrowseConfig.mockReturnValue(withLabs({}));

            render(<Gate />);

            expect(screen.getByTestId('ember-list-with-gift-links')).toBeInTheDocument();
        });

        it('renders the Ember list when the config query fails', () => {
            mockUseBrowseConfig.mockReturnValue(configResult({isError: true}));

            render(<Gate />);

            expect(screen.getByTestId('ember-list-with-gift-links')).toBeInTheDocument();
        });

        it('renders nothing while config is loading', () => {
            mockUseBrowseConfig.mockReturnValue(configResult({isLoading: true}));

            const {container} = render(<Gate />);

            expect(container).toBeEmptyDOMElement();
        });

        // The two gates are otherwise identical, so a copy-paste slip that had
        // PagesListGate load the posts screen would ship silently without this.
        it(`renders the React ${resource} screen while the flag is on`, async () => {
            mockUseBrowseConfig.mockReturnValue(withLabs({postsListReact: true}));

            render(<Gate />);

            await waitFor(() => {
                expect(screen.getByTestId('react-screen')).toBeInTheDocument();
            });
            expect(screen.getByTestId('react-screen')).toHaveAttribute('data-resource', resource);
            expect(screen.queryByTestId('ember-list-with-gift-links')).not.toBeInTheDocument();
        });
    });
});
