import {act} from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {StateBridge, StateBridgeEventMap, SubscriptionState} from './ember-bridge/ember-bridge';
import {DunningInterventionHost} from './dunning-intervention-host';

const navigateTo = vi.fn();

vi.mock('./utils/navigation', () => ({
    navigateTo: (route: string) => {
        navigateTo(route);
        return true;
    }
}));

const owner = {roles: [{name: 'Owner' as const}]};
const staff = {roles: [{name: 'Administrator' as const}]};

function createStateBridge(subscriptionState: SubscriptionState | null) {
    const listeners = new Set<(state: SubscriptionState) => void>();
    const stateBridge: StateBridge & {emit: (state: SubscriptionState) => void} = {
        subscriptionState,
        onUpdate: vi.fn(),
        onInvalidate: vi.fn(),
        onDelete: vi.fn(),
        on: vi.fn(<K extends keyof StateBridgeEventMap>(event: K, callback: (payload: StateBridgeEventMap[K]) => void) => {
            if (event === 'subscriptionChange') {
                listeners.add(callback as (state: SubscriptionState) => void);
            }
        }),
        off: vi.fn(<K extends keyof StateBridgeEventMap>(event: K, callback: (payload: StateBridgeEventMap[K]) => void) => {
            if (event === 'subscriptionChange') {
                listeners.delete(callback as (state: SubscriptionState) => void);
            }
        }),
        sidebarVisible: true,
        getRouteUrl: vi.fn(),
        isRouteActive: vi.fn(),
        emit(state) {
            this.subscriptionState = state;
            listeners.forEach(listener => listener(state));
        }
    };

    window.EmberBridge = {state: stateBridge};
    return stateBridge;
}

function overdueState(overrides: Partial<SubscriptionState> = {}): SubscriptionState {
    return {
        subscription: {status: 'past_due'},
        paymentAttempts: 3,
        forceUpgrade: false,
        ...overrides
    };
}

beforeEach(() => {
    navigateTo.mockReset();
});

afterEach(() => {
    delete window.EmberBridge;
});

describe('DunningInterventionHost', () => {
    it.each(['past_due', 'unpaid'])('shows counted owner copy for %s', (status) => {
        createStateBridge(overdueState({subscription: {status}}));

        render(<DunningInterventionHost currentUser={owner} />);

        expect(screen.getByRole('dialog', {name: 'Your payment has failed 3 times'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Update payment details'})).toBeInTheDocument();
    });

    it('uses generic owner copy when the attempt count is unavailable', () => {
        createStateBridge(overdueState({paymentAttempts: null}));

        render(<DunningInterventionHost currentUser={owner} />);

        expect(screen.getByRole('dialog', {name: 'Your payment has failed'})).toBeInTheDocument();
    });

    it('uses singular copy for the first failed payment attempt', () => {
        createStateBridge(overdueState({paymentAttempts: 1}));

        render(<DunningInterventionHost currentUser={owner} />);

        expect(screen.getByRole('dialog', {name: 'Your payment has failed 1 time'})).toBeInTheDocument();
    });

    it('shows non-sensitive staff copy without attempts or Billing controls', () => {
        createStateBridge(overdueState({paymentAttempts: 5}));

        render(<DunningInterventionHost currentUser={staff} />);

        expect(screen.getByRole('dialog', {name: 'This site’s billing needs attention'})).toBeInTheDocument();
        expect(screen.queryByText(/5/)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Update payment details'})).not.toBeInTheDocument();
    });

    it('does not show the reminder after forceUpgrade activates', () => {
        createStateBridge(overdueState({forceUpgrade: true}));

        render(<DunningInterventionHost currentUser={owner} />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('stays dismissed through later subscription events in the same Admin load', () => {
        const stateBridge = createStateBridge(overdueState());
        render(<DunningInterventionHost currentUser={owner} />);

        fireEvent.click(screen.getByRole('button', {name: 'Dismiss for now'}));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        act(() => stateBridge.emit(overdueState({paymentAttempts: 4})));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('dismisses with Escape', () => {
        createStateBridge(overdueState());
        render(<DunningInterventionHost currentUser={owner} />);

        fireEvent.keyDown(document, {key: 'Escape'});

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not dismiss from a backdrop interaction', () => {
        createStateBridge(overdueState());
        render(<DunningInterventionHost currentUser={owner} />);
        const dialog = screen.getByRole('dialog');
        const backdrop = dialog.parentElement?.firstElementChild;

        expect(backdrop).toBeTruthy();
        fireEvent.pointerDown(backdrop!);
        fireEvent.click(backdrop!);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('can show again after a full React host remount', () => {
        createStateBridge(overdueState());
        const firstLoad = render(<DunningInterventionHost currentUser={owner} />);
        fireEvent.click(screen.getByRole('button', {name: 'Dismiss for now'}));
        firstLoad.unmount();

        render(<DunningInterventionHost currentUser={owner} />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('dismisses before handing an owner to Billing', () => {
        createStateBridge(overdueState());
        render(<DunningInterventionHost currentUser={owner} />);

        fireEvent.click(screen.getByRole('button', {name: 'Update payment details'}));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(navigateTo).toHaveBeenCalledWith('/pro');
    });
});
