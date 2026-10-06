import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BillingRoute } from './billing-route';

const { mockOwner, mockCanAccess, mockSetScreenOpen } = vi.hoisted(() => ({
  mockOwner: vi.fn<() => 'react' | 'ember' | 'pending'>(),
  mockCanAccess: vi.fn<() => boolean | undefined>(),
  mockSetScreenOpen: vi.fn<(open: boolean) => void>(),
}));

vi.mock('@/use-flag-gated-route-owner', () => ({ useFlagGatedRouteOwner: mockOwner }));
vi.mock('@/ember-bridge', () => ({
  EmberFallback: () => React.createElement('div', { 'data-testid': 'ember-fallback' }),
}));
vi.mock('@tryghost/admin-x-framework', () => ({
  Navigate: ({ to }: { to: string }) =>
    React.createElement('div', { 'data-testid': `navigate:${to}` }),
}));
vi.mock('./subscription-status', () => ({
  BILLING_REACT_FLAG: 'billingReact',
  useCanAccessBilling: mockCanAccess,
}));
vi.mock('./billing-screen', () => ({ setBillingScreenOpen: mockSetScreenOpen }));

describe('BillingRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['ember', 'pending'] as const)(
    'leaves the screen to Ember while ownership is %s',
    (owner) => {
      mockOwner.mockReturnValue(owner);
      mockCanAccess.mockReturnValue(true);

      render(<BillingRoute />);

      expect(screen.getByTestId('ember-fallback')).toBeInTheDocument();
      expect(mockSetScreenOpen).not.toHaveBeenCalled();
    },
  );

  it('opens the screen for users who may manage billing', () => {
    mockOwner.mockReturnValue('react');
    mockCanAccess.mockReturnValue(true);

    const { unmount } = render(<BillingRoute />);
    expect(mockSetScreenOpen).toHaveBeenLastCalledWith(true);

    unmount();
    expect(mockSetScreenOpen).toHaveBeenLastCalledWith(false);
  });

  it('sends everyone else home', () => {
    mockOwner.mockReturnValue('react');
    mockCanAccess.mockReturnValue(false);

    render(<BillingRoute />);

    expect(screen.getByTestId('navigate:/')).toBeInTheDocument();
    expect(mockSetScreenOpen).not.toHaveBeenCalled();
  });

  it('waits for access to be known', () => {
    mockOwner.mockReturnValue('react');
    mockCanAccess.mockReturnValue(undefined);

    const { rerender } = render(<BillingRoute />);
    expect(mockSetScreenOpen).not.toHaveBeenCalled();
    expect(screen.queryByTestId('navigate:/')).not.toBeInTheDocument();

    mockCanAccess.mockReturnValue(true);
    rerender(<BillingRoute />);
    expect(mockSetScreenOpen).toHaveBeenLastCalledWith(true);
  });

  it('keeps the access decided on entry for the rest of the visit', () => {
    mockOwner.mockReturnValue('react');
    mockCanAccess.mockReturnValue(true);
    const { rerender } = render(<BillingRoute />);

    mockCanAccess.mockReturnValue(false);
    rerender(<BillingRoute />);

    expect(screen.queryByTestId('navigate:/')).not.toBeInTheDocument();
    expect(mockSetScreenOpen).not.toHaveBeenCalledWith(false);
  });
});
