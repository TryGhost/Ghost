import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HostLimitGate } from './host-limit-gate';

const mocks = vi.hoisted(() => {
  const state: { config: unknown } = { config: undefined };
  return state;
});

// Settings, where the gate is used, loads config before it renders, so its acceptance tests
// can't reach the loading state: config is held back here instead.
vi.mock('@tryghost/admin-x-framework/api/config', () => ({
  useBrowseConfig: () => ({ data: mocks.config }),
}));

const gate = () => (
  <HostLimitGate limit="limitCustomFields" limited="Upgrade notice">
    Content
  </HostLimitGate>
);

describe('HostLimitGate', () => {
  it('shows neither the content nor the upgrade until config says what the plan includes', () => {
    mocks.config = undefined;
    const { container, rerender } = render(gate());

    expect(container.textContent).toBe('');

    mocks.config = { config: { hostSettings: {} } };
    rerender(gate());

    expect(screen.getByText('Content')).toBeTruthy();
  });
});
