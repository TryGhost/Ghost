import { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StateBridge, StateBridgeEventMap, SubscriptionState } from './ember-bridge';
import { DunningModal } from './dunning-modal';

const navigateTo = vi.fn();
const { mockUseBrowseConfig } = vi.hoisted(() => ({
  mockUseBrowseConfig: vi.fn(),
}));

vi.mock('@tryghost/admin-x-framework/api/config', () => ({
  useBrowseConfig: mockUseBrowseConfig,
}));

vi.mock('./utils/navigation', () => ({
  navigateTo: (route: string) => {
    navigateTo(route);
    return true;
  },
}));

const owner = { roles: [{ name: 'Owner' as const }] };
const staff = { roles: [{ name: 'Administrator' as const }] };

function createStateBridge(subscriptionState: SubscriptionState | null) {
  const listeners = new Set<(state: SubscriptionState) => void>();
  const routeListeners = new Set<(event: StateBridgeEventMap['routeChange']) => void>();
  let activeRoute = 'posts';
  const stateBridge: StateBridge & {
    emit: (state: SubscriptionState) => void;
    setActiveRoute: (routeName: string) => void;
  } = {
    subscriptionState,
    onUpdate: vi.fn(),
    onInvalidate: vi.fn(),
    onDelete: vi.fn(),
    on: vi.fn(
      <K extends keyof StateBridgeEventMap>(
        event: K,
        callback: (payload: StateBridgeEventMap[K]) => void,
      ) => {
        if (event === 'subscriptionChange') {
          listeners.add(callback as (state: SubscriptionState) => void);
        }
        if (event === 'routeChange') {
          routeListeners.add(callback as (event: StateBridgeEventMap['routeChange']) => void);
        }
      },
    ),
    off: vi.fn(
      <K extends keyof StateBridgeEventMap>(
        event: K,
        callback: (payload: StateBridgeEventMap[K]) => void,
      ) => {
        if (event === 'subscriptionChange') {
          listeners.delete(callback as (state: SubscriptionState) => void);
        }
        if (event === 'routeChange') {
          routeListeners.delete(callback as (event: StateBridgeEventMap['routeChange']) => void);
        }
      },
    ),
    sidebarVisible: true,
    getRouteUrl: vi.fn(),
    isRouteActive: vi.fn((routeNames: string | string[]) => {
      const routes = Array.isArray(routeNames) ? routeNames : routeNames.split(' ');
      return routes.includes(activeRoute);
    }),
    emit(state) {
      this.subscriptionState = state;
      listeners.forEach((listener) => listener(state));
    },
    setActiveRoute(routeName) {
      activeRoute = routeName;
      routeListeners.forEach((listener) => listener({ routeName, queryParams: {} }));
    },
  };

  window.EmberBridge = { state: stateBridge };
  return stateBridge;
}

function overdueState(
  overrides: Partial<NonNullable<SubscriptionState['subscription']>> = {},
): SubscriptionState {
  return {
    isGrace: true,
    subscription: {
      status: 'past_due',
      paymentAttempts: 3,
      forceUpgrade: false,
      ...overrides,
    },
  };
}

beforeEach(() => {
  navigateTo.mockReset();
  mockUseBrowseConfig.mockReturnValue({
    data: {
      config: {
        hostSettings: {
          billing: {
            enabled: true,
          },
        },
      },
    },
  });
});

afterEach(() => {
  delete window.EmberBridge;
});

describe('DunningModal', () => {
  it.each([
    ['disabled', { data: { config: { hostSettings: { billing: { enabled: false } } } } }],
    ['missing', { data: { config: { hostSettings: {} } } }],
    ['still loading', { data: undefined }],
  ])('does not render when hosted Billing is %s', (_case, configResult) => {
    mockUseBrowseConfig.mockReturnValue(configResult);
    createStateBridge(overdueState());

    render(<DunningModal currentUser={owner} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows counted owner copy when Billing reports grace', () => {
    createStateBridge(overdueState());

    render(<DunningModal currentUser={owner} />);

    expect(
      screen.getByRole('dialog', { name: 'Your payment has failed 3 times' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update payment details' })).toBeInTheDocument();
  });

  it('does not render on the Pro route where Billing already owns the payment modal', () => {
    const stateBridge = createStateBridge(overdueState());
    stateBridge.setActiveRoute('pro');

    render(<DunningModal currentUser={owner} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('tracks navigation into and away from the Pro route', () => {
    const stateBridge = createStateBridge(overdueState());
    render(<DunningModal currentUser={owner} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    act(() => stateBridge.setActiveRoute('pro'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act(() => stateBridge.setActiveRoute('posts'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('follows Billing grace changes without inferring from subscription status', () => {
    const stateBridge = createStateBridge({
      isGrace: false,
      subscription: {
        status: 'past_due',
        paymentAttempts: 3,
        forceUpgrade: false,
      },
    });
    render(<DunningModal currentUser={owner} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act(() => stateBridge.emit(overdueState()));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    act(() => stateBridge.emit({ ...overdueState(), isGrace: false }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each(['past_due', 'unpaid'])(
    'does not infer dunning from the %s subscription status',
    (status) => {
      createStateBridge({
        isGrace: false,
        subscription: {
          status,
          paymentAttempts: 3,
          forceUpgrade: false,
        },
      });

      render(<DunningModal currentUser={owner} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    },
  );

  it('keeps the dialog fixed to the viewport', () => {
    createStateBridge(overdueState());

    render(<DunningModal currentUser={owner} />);

    expect(screen.getByRole('dialog')).toHaveClass('fixed');
    expect(screen.getByRole('dialog')).not.toHaveClass('relative');
  });

  it.each([null, 0])('uses generic owner copy for attempt count %s', (paymentAttempts) => {
    createStateBridge(overdueState({ paymentAttempts }));

    render(<DunningModal currentUser={owner} />);

    expect(screen.getByRole('dialog', { name: 'Your payment has failed' })).toBeInTheDocument();
  });

  it('uses singular copy for the first failed payment attempt', () => {
    createStateBridge(overdueState({ paymentAttempts: 1 }));

    render(<DunningModal currentUser={owner} />);

    expect(
      screen.getByRole('dialog', { name: 'Your payment has failed 1 time' }),
    ).toBeInTheDocument();
  });

  it('shows non-sensitive staff copy without attempts or Billing controls', () => {
    createStateBridge(overdueState({ paymentAttempts: 5 }));

    render(<DunningModal currentUser={staff} />);

    expect(
      screen.getByRole('dialog', { name: 'This site’s billing needs attention' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/5/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Update payment details' }),
    ).not.toBeInTheDocument();
  });

  it('does not show the reminder after forceUpgrade activates', () => {
    createStateBridge(overdueState({ forceUpgrade: true }));

    render(<DunningModal currentUser={owner} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the reminder when Billing clears forceUpgrade in the live subscription state', () => {
    const stateBridge = createStateBridge(overdueState({ forceUpgrade: true }));
    render(<DunningModal currentUser={owner} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act(() => stateBridge.emit(overdueState({ forceUpgrade: false })));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('stays dismissed through later subscription events in the same Admin load', () => {
    const stateBridge = createStateBridge(overdueState());
    render(<DunningModal currentUser={owner} />);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss for now' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act(() => stateBridge.emit(overdueState({ paymentAttempts: 4 })));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('dismisses with Escape', () => {
    createStateBridge(overdueState());
    render(<DunningModal currentUser={owner} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not dismiss from a backdrop interaction', async () => {
    createStateBridge(overdueState());
    render(<DunningModal currentUser={owner} />);
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement?.firstElementChild;

    expect(backdrop).toBeTruthy();

    // Radix registers its outside-pointer listener on the next task so that
    // the interaction which opened a dialog cannot immediately close it.
    await act(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, 0);
        }),
    );

    fireEvent.pointerDown(backdrop!);
    fireEvent.click(backdrop!);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('can show again after a full React host remount', () => {
    createStateBridge(overdueState());
    const firstLoad = render(<DunningModal currentUser={owner} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss for now' }));
    firstLoad.unmount();

    render(<DunningModal currentUser={owner} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('dismisses before handing an owner to Billing', () => {
    createStateBridge(overdueState());
    render(<DunningModal currentUser={owner} />);

    fireEvent.click(screen.getByRole('button', { name: 'Update payment details' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(navigateTo).toHaveBeenCalledWith('/pro');
  });
});
