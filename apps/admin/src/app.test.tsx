import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import App from './app';

const state = vi.hoisted(() => ({
  pathname: '/tags/news',
  owner: 'pending',
  pageChrome: true,
}));

vi.mock('@tryghost/admin-x-framework', () => ({
  Outlet: () => <div>Routed page</div>,
  useLocation: () => ({ pathname: state.pathname, key: state.pathname }),
}));
vi.mock('@tryghost/admin-x-framework/hooks', () => ({ useFeatureFlag: () => state.pageChrome }));
vi.mock('@tryghost/admin-x-framework/api/current-user', () => ({
  useCurrentUser: () => ({ data: { id: 'user' } }),
}));
vi.mock('@tryghost/admin-x-framework/api/config', () => ({
  useBrowseConfig: () => ({ isPending: false, isFetched: true }),
}));
vi.mock('@tryghost/admin-x-framework/api/settings', () => ({ useBrowseSettings: () => ({}) }));
vi.mock('./hooks/user-preferences', () => ({
  useUserPreferences: () => ({ data: {}, isFetched: true }),
}));
vi.mock('./providers/theme-context', () => ({ useThemeContext: () => ({ isThemeReady: true }) }));
vi.mock('./use-flag-gated-route-owner', () => ({ useFlagGatedRouteOwner: () => state.owner }));
vi.mock('./docsbot-widget-host', () => ({ DocsBotWidgetHost: () => null }));
vi.mock('./ember-bridge', () => ({
  EmberProvider: ({ children }: { children: ReactNode }) => children,
  EmberFallback: () => null,
  EmberRoot: () => <div data-testid="ember-root" />,
  useEmberAuthSync: () => undefined,
  useEmberDataSync: () => undefined,
}));
vi.mock('./layout/app-sidebar/hooks/use-navigation-preferences', () => ({
  useNavigationPreferences: () => ({ data: { menu: { visible: false } } }),
  useNavigationMenuVisibility: () => [false, vi.fn()],
}));
vi.mock('./layout/admin-layout', async () => {
  // Keep the real controller: first shell paint must respect the saved closed
  // preference for React, or the legacy open behavior for Ember ownership.
  const { useAdminSidebar } = await import('./layout/use-admin-sidebar');
  return {
    AdminLayout: ({ children }: { children: ReactNode }) => {
      const sidebar = useAdminSidebar(state.pageChrome);
      return (
        <div data-state={sidebar.open ? 'expanded' : 'collapsed'} data-testid="admin-layout">
          {children}
        </div>
      );
    },
  };
});

describe('Admin shell tag-detail readiness', () => {
  beforeEach(() => {
    state.pathname = '/tags/news';
    state.owner = 'pending';
    state.pageChrome = true;
  });

  it.each([
    ['react', 'collapsed'],
    ['ember', 'expanded'],
  ] as const)('waits for %s ownership before first painting a %s sidebar', (owner, expected) => {
    const { rerender } = render(<App />);
    expect(screen.queryByTestId('admin-layout')).not.toBeInTheDocument();
    expect(screen.getByTestId('ember-root')).toBeInTheDocument();
    state.owner = owner;
    rerender(<App />);
    expect(screen.getByTestId('admin-layout')).toHaveAttribute('data-state', expected);
  });

  it('does not wait on the unrelated tag owner on other routes', () => {
    state.pathname = '/members';
    render(<App />);
    expect(screen.getByTestId('admin-layout')).toHaveAttribute('data-state', 'collapsed');
  });

  it('does not change flag-off boot behavior', () => {
    state.pageChrome = false;
    render(<App />);
    expect(screen.getByTestId('admin-layout')).toHaveAttribute('data-state', 'expanded');
  });
});
