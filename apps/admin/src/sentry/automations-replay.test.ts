import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setTag } from '@sentry/react';
import {
  createAutomationsReplay,
  isAutomationsPath,
  type AutomationsReplay,
} from './automations-replay';

vi.mock('@sentry/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sentry/react')>()),
  setTag: vi.fn(),
}));

const MASK = 'data-sentry-automations-mask';

function fakeReplay({ stopFails = false } = {}) {
  return {
    start: vi.fn(),
    stop: vi.fn(() => (stopFails ? Promise.reject(new Error('stop failed')) : Promise.resolve())),
    startBuffering: vi.fn(),
  };
}

describe('isAutomationsPath', () => {
  it.each(['/automations', '/automations/', '/automations/abc123'])('matches %s', (path) => {
    expect(isAutomationsPath(path)).toBe(true);
  });

  it.each(['/', '/posts', '/automationsx', '/settings/automations'])(
    'does not match %s',
    (path) => {
      expect(isAutomationsPath(path)).toBe(false);
    },
  );
});

describe('createAutomationsReplay', () => {
  let automationsReplay: AutomationsReplay | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(setTag).mockClear();
  });

  afterEach(() => {
    automationsReplay?.dispose();
    automationsReplay = undefined;
    vi.useRealTimers();
  });

  it('masks a direct Automations load before the deferred recording starts', async () => {
    const replay = fakeReplay();
    automationsReplay = createAutomationsReplay(replay, true, '/automations/abc123');

    expect(document.body.getAttribute(MASK)).toBe('true');
    expect(replay.stop).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();

    expect(replay.stop).toHaveBeenCalledTimes(1);
    expect(replay.start).toHaveBeenCalledTimes(1);
    expect(setTag).toHaveBeenCalledWith('replay_area', 'automations');
  });

  it('starts recording once, on the first visit to Automations', async () => {
    const replay = fakeReplay();
    automationsReplay = createAutomationsReplay(replay, true, '/posts');
    await vi.runAllTimersAsync();

    expect(document.body.hasAttribute(MASK)).toBe(false);
    expect(replay.stop).not.toHaveBeenCalled();

    automationsReplay.update('/automations');
    await vi.runAllTimersAsync();
    automationsReplay.update('/posts');
    automationsReplay.update('/automations/abc123');
    await vi.runAllTimersAsync();

    expect(replay.stop).toHaveBeenCalledTimes(1);
    expect(replay.start).toHaveBeenCalledTimes(1);
  });

  it('waits for the deferred check before starting on an early navigation', async () => {
    const replay = fakeReplay();
    automationsReplay = createAutomationsReplay(replay, true, '/posts');

    automationsReplay.update('/automations');
    expect(replay.stop).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();
    expect(replay.stop).toHaveBeenCalledTimes(1);
  });

  it('masks only while an Automations route shows', async () => {
    automationsReplay = createAutomationsReplay(fakeReplay(), true, '/automations');
    await vi.runAllTimersAsync();
    expect(document.body.getAttribute(MASK)).toBe('true');

    automationsReplay.update('/posts');
    expect(document.body.hasAttribute(MASK)).toBe(false);
  });

  it('masks without recording when the load is not sampled', async () => {
    const replay = fakeReplay();
    automationsReplay = createAutomationsReplay(replay, false, '/automations');
    await vi.runAllTimersAsync();

    expect(document.body.getAttribute(MASK)).toBe('true');
    expect(replay.stop).not.toHaveBeenCalled();
  });

  it('falls back to error buffering when the switch fails', async () => {
    const replay = fakeReplay({ stopFails: true });
    automationsReplay = createAutomationsReplay(replay, true, '/automations');
    await vi.runAllTimersAsync();

    expect(replay.start).not.toHaveBeenCalled();
    expect(replay.startBuffering).toHaveBeenCalledTimes(1);
    expect(setTag).not.toHaveBeenCalled();
  });

  it('cancels the deferred check and clears the mask on dispose', async () => {
    const replay = fakeReplay();
    automationsReplay = createAutomationsReplay(replay, true, '/automations');

    automationsReplay.dispose();
    await vi.runAllTimersAsync();

    expect(document.body.hasAttribute(MASK)).toBe(false);
    expect(replay.stop).not.toHaveBeenCalled();
  });
});
