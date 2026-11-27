import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BillingRoute } from './billing-route';

const { mockCanAccess, mockSetScreenOpen } = vi.hoisted(() => ({
  mockCanAccess: vi.fn<() => boolean | undefined>(),
  mockSetScreenOpen: vi.fn<(open: boolean) => void>(),
}));

vi.mock('@tryghost/admin-x-framework', () => ({
  Navigate: ({ to }: { to: string }) =>
    React.createElement('div', { 'data-testid': `navigate:${to}` }),
}));
vi.mock('./subscription-status', () => ({
  useCanAccessBilling: mockCanAccess,
}));
vi.mock('./billing-screen', () => ({ setBillingScreenOpen: mockSetScreenOpen }));

describe('BillingRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the screen for users who may manage billing', () => {
    mockCanAccess.mockReturnValue(true);

    const { unmount } = render(<BillingRoute />);
    expect(mockSetScreenOpen).toHaveBeenLastCalledWith(true);

    unmount();
    expect(mockSetScreenOpen).toHaveBeenLastCalledWith(false);
  });

  it('sends everyone else home', () => {
    mockCanAccess.mockReturnValue(false);

    render(<BillingRoute />);

    expect(screen.getByTestId('navigate:/')).toBeInTheDocument();
    expect(mockSetScreenOpen).not.toHaveBeenCalled();
  });

  it('waits for access to be known', () => {
    mockCanAccess.mockReturnValue(undefined);

    const { rerender } = render(<BillingRoute />);
    expect(mockSetScreenOpen).not.toHaveBeenCalled();
    expect(screen.queryByTestId('navigate:/')).not.toBeInTheDocument();

    mockCanAccess.mockReturnValue(true);
    rerender(<BillingRoute />);
    expect(mockSetScreenOpen).toHaveBeenLastCalledWith(true);
  });

  it('keeps the access decided on entry for the rest of the visit', () => {
    mockCanAccess.mockReturnValue(true);
    const { rerender } = render(<BillingRoute />);

    mockCanAccess.mockReturnValue(false);
    rerender(<BillingRoute />);

    expect(screen.queryByTestId('navigate:/')).not.toBeInTheDocument();
    expect(mockSetScreenOpen).not.toHaveBeenCalledWith(false);
  });
});
