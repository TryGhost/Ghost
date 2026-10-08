import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetFlagGatedRouteOwners, useFlagGatedRouteOwner } from './use-flag-gated-route-owner';

const { mockUseBrowseConfig } = vi.hoisted(() => ({
  mockUseBrowseConfig: vi.fn(),
}));

vi.mock('@tryghost/admin-x-framework/api/config', () => ({
  useBrowseConfig: mockUseBrowseConfig,
}));

vi.mock('./ember-bridge', () => ({
  useEmberFeatureFlag: (flag: string) => {
    const stateBridge = window.EmberBridge?.state;
    if (!stateBridge?.isFeatureEnabled) {
      return undefined;
    }
    return stateBridge.isFeatureEnabled(flag) ?? null;
  },
}));

const configResult = (overrides: Record<string, unknown>) => ({
  data: undefined,
  isError: false,
  isLoading: false,
  ...overrides,
});

const withLabs = (labs: Record<string, unknown>) => configResult({ data: { config: { labs } } });

function emberReports(enabled: boolean | null) {
  window.EmberBridge = {
    state: { isFeatureEnabled: () => enabled },
  } as unknown as typeof window.EmberBridge;
}

describe('useFlagGatedRouteOwner', () => {
  beforeEach(() => {
    mockUseBrowseConfig.mockReset();
    delete window.EmberBridge;
    resetFlagGatedRouteOwners();
  });

  it('keeps React after a config refetch turns the flag off', () => {
    mockUseBrowseConfig.mockReturnValue(withLabs({ editorReact: true }));
    const { result, rerender } = renderHook(() => useFlagGatedRouteOwner('editorReact'));
    expect(result.current).toBe('react');

    mockUseBrowseConfig.mockReturnValue(withLabs({ editorReact: false }));
    rerender();

    expect(result.current).toBe('react');
  });

  it('keeps Ember after a config refetch turns the flag on', () => {
    mockUseBrowseConfig.mockReturnValue(withLabs({ editorReact: false }));
    const { result, rerender } = renderHook(() => useFlagGatedRouteOwner('editorReact'));
    expect(result.current).toBe('ember');

    mockUseBrowseConfig.mockReturnValue(withLabs({ editorReact: true }));
    rerender();

    expect(result.current).toBe('ember');
  });

  it('stays pending until the first resolution, then holds it', () => {
    mockUseBrowseConfig.mockReturnValue(configResult({ isLoading: true }));
    const { result, rerender } = renderHook(() => useFlagGatedRouteOwner('editorReact'));
    expect(result.current).toBe('pending');

    mockUseBrowseConfig.mockReturnValue(withLabs({ editorReact: true }));
    rerender();
    expect(result.current).toBe('react');

    mockUseBrowseConfig.mockReturnValue(withLabs({ editorReact: false }));
    rerender();
    expect(result.current).toBe('react');
  });

  it('holds Ember after the first config fetch fails', () => {
    mockUseBrowseConfig.mockReturnValue(configResult({ isError: true }));
    const { result, rerender } = renderHook(() => useFlagGatedRouteOwner('editorReact'));
    expect(result.current).toBe('ember');

    mockUseBrowseConfig.mockReturnValue(withLabs({ editorReact: true }));
    rerender();

    expect(result.current).toBe('ember');
  });

  it('keeps the owner Ember reported first when its flags refresh', () => {
    mockUseBrowseConfig.mockReturnValue(withLabs({ editorReact: true }));
    emberReports(false);
    const { result, rerender } = renderHook(() => useFlagGatedRouteOwner('editorReact'));
    expect(result.current).toBe('ember');

    emberReports(true);
    rerender();

    expect(result.current).toBe('ember');
  });

  it('does not latch while Ember is still loading its flags', () => {
    mockUseBrowseConfig.mockReturnValue(withLabs({ editorReact: false }));
    emberReports(null);
    const { result, rerender } = renderHook(() => useFlagGatedRouteOwner('editorReact'));
    expect(result.current).toBe('pending');

    emberReports(true);
    rerender();

    expect(result.current).toBe('react');
  });

  it('latches each flag on its own', () => {
    mockUseBrowseConfig.mockReturnValue(withLabs({ editorReact: true, billingReact: false }));
    const { result, rerender } = renderHook(() => ({
      editor: useFlagGatedRouteOwner('editorReact'),
      billing: useFlagGatedRouteOwner('billingReact'),
    }));
    expect(result.current).toEqual({ editor: 'react', billing: 'ember' });

    mockUseBrowseConfig.mockReturnValue(withLabs({ editorReact: false, billingReact: true }));
    rerender();

    expect(result.current).toEqual({ editor: 'react', billing: 'ember' });
  });

  it('resolves afresh after a reset', () => {
    mockUseBrowseConfig.mockReturnValue(withLabs({ editorReact: false }));
    const first = renderHook(() => useFlagGatedRouteOwner('editorReact'));
    expect(first.result.current).toBe('ember');
    first.unmount();

    resetFlagGatedRouteOwners();
    mockUseBrowseConfig.mockReturnValue(withLabs({ editorReact: true }));
    const second = renderHook(() => useFlagGatedRouteOwner('editorReact'));

    expect(second.result.current).toBe('react');
  });
});
