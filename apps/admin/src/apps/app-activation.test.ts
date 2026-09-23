import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  activateApp,
  deactivateApp,
  isAppActivated,
  resetAppActivation,
  useAppActivation,
} from './app-activation';

describe('app activation store', () => {
  beforeEach(() => {
    resetAppActivation();
  });

  it('starts with nothing activated', () => {
    expect(isAppActivated('podcasts')).toBe(false);
  });

  it('activates and deactivates an app', () => {
    activateApp('podcasts');
    expect(isAppActivated('podcasts')).toBe(true);

    deactivateApp('podcasts');
    expect(isAppActivated('podcasts')).toBe(false);
  });

  it('persists activation to localStorage', () => {
    activateApp('podcasts');
    expect(window.localStorage.getItem('ghost-admin:apps:activated')).toBe('["podcasts"]');
  });

  it('ignores malformed stored state', () => {
    window.localStorage.setItem('ghost-admin:apps:activated', '{not json');
    resetAppActivation();
    window.localStorage.setItem('ghost-admin:apps:activated', '{not json');
    expect(isAppActivated('podcasts')).toBe(false);
  });

  it('notifies hook consumers when activation changes', () => {
    const { result } = renderHook(() => useAppActivation('podcasts'));
    expect(result.current.isActivated).toBe(false);

    act(() => result.current.activate());
    expect(result.current.isActivated).toBe(true);

    act(() => result.current.deactivate());
    expect(result.current.isActivated).toBe(false);
  });
});
