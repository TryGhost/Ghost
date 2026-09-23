// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import { render } from 'preact';
import settings from '../src/editor-settings.tsx';
import type { AddonEditorSettingsBridge } from '@tryghost/addon-kit/editor-settings';

let receive: (props: Record<string, unknown>) => void;
afterEach(() => {
  render(null, document.body);
});

it('restores canonical values when a pending edit is discarded, then accepts undo', async () => {
  let finish!: () => void;
  const ghost: AddonEditorSettingsBridge = {
    blockName: 'episode',
    props: { title: '' },
    onPropsChange: (fn) => {
      receive = (next) => {
        ghost.props = next;
        fn(next);
      };
      return () => {};
    },
    proposePatch: vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    ),
    fetch: vi.fn(),
    assets: { uploadImage: vi.fn() },
  };
  act(() => settings(ghost));
  const title = () =>
    document.querySelectorAll('gh-editor-input')[0] as HTMLElement & { value: string };
  act(() => title().dispatchEvent(new CustomEvent('change', { detail: 'Discarded' })));
  await act(async () => {
    finish();
    await Promise.resolve();
  });
  expect(title().value).toBe('');
  act(() => receive({ title: 'Restored by undo' }));
  expect(title().value).toBe('Restored by undo');
});

it('discards every uncommitted field when the latest cumulative render fails', async () => {
  const jobs: { resolve: () => void; reject: (reason: Error) => void }[] = [];
  const ghost: AddonEditorSettingsBridge = {
    blockName: 'episode',
    props: { title: '', season_number: null },
    onPropsChange: (fn) => {
      receive = fn;
      return () => {};
    },
    proposePatch: vi.fn(
      () =>
        new Promise<void>((resolve, reject) => {
          jobs.push({ resolve, reject });
        }),
    ),
    fetch: vi.fn(),
    assets: { uploadImage: vi.fn() },
  };
  act(() => settings(ghost));
  const inputs = () =>
    document.querySelectorAll('gh-editor-input') as NodeListOf<HTMLElement & { value: string }>;
  act(() => inputs()[0].dispatchEvent(new CustomEvent('change', { detail: 'Unsaved title' })));
  act(() => inputs()[2].dispatchEvent(new CustomEvent('change', { detail: '2' })));
  await act(async () => {
    jobs[0].resolve();
    jobs[1].reject(new Error('Rendering failed'));
    await Promise.resolve();
  });
  expect(inputs()[0].value).toBe('');
  act(() => receive({ title: 'Restored by undo', season_number: null }));
  expect(inputs()[0].value).toBe('Restored by undo');
});
