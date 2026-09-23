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

it('patches each media slot independently and allows clearing a file', async () => {
  const ghost: AddonEditorSettingsBridge = {
    blockName: 'episode',
    props: { offer_free: true },
    onPropsChange: () => () => {},
    proposePatch: vi.fn().mockResolvedValue(undefined),
    fetch: vi.fn(),
    assets: { uploadImage: vi.fn() },
  };
  act(() => settings(ghost));
  const inputs = document.querySelectorAll('gh-media-upload');
  const slots = ['full_audio', 'full_video', 'free_audio', 'free_video'];
  expect(inputs).toHaveLength(4);
  for (const [index, slot] of slots.entries()) {
    const media = {
      url: `https://site.test/${slot}`,
      mime_type: slot.endsWith('audio') ? 'audio/mpeg' : 'video/mp4',
      byte_length: 100,
    };
    await act(async () => {
      inputs[index].dispatchEvent(new CustomEvent('change', { detail: media }));
    });
    expect(ghost.proposePatch).toHaveBeenLastCalledWith({ [slot]: media, version: 1 });
  }
  await act(async () => {
    inputs[0].dispatchEvent(new CustomEvent('change', { detail: null }));
  });
  expect(ghost.proposePatch).toHaveBeenLastCalledWith({ full_audio: null, version: 1 });
});

it('reveals free media fields with the toggle and retains files when disabled', async () => {
  const preview = {
    url: 'https://site.test/preview.mp3',
    mime_type: 'audio/mpeg',
    byte_length: 100,
  };
  const ghost: AddonEditorSettingsBridge = {
    blockName: 'episode',
    props: { offer_free: false, free_audio: preview },
    onPropsChange: () => () => {},
    proposePatch: vi.fn(async (patch) => {
      ghost.props = { ...ghost.props, ...patch };
    }),
    fetch: vi.fn(),
    assets: { uploadImage: vi.fn() },
  };
  act(() => settings(ghost));
  const toggle = document.querySelector('gh-editor-toggle')!;
  expect(document.querySelectorAll('gh-media-upload')).toHaveLength(2);
  await act(async () => {
    toggle.dispatchEvent(new CustomEvent('change', { detail: true }));
  });
  expect(document.querySelectorAll('gh-media-upload')).toHaveLength(4);
  expect(
    (document.querySelectorAll('gh-media-upload')[2] as HTMLElement & { url: string }).url,
  ).toBe(preview.url);
  await act(async () => {
    toggle.dispatchEvent(new CustomEvent('change', { detail: false }));
  });
  expect(document.querySelectorAll('gh-media-upload')).toHaveLength(2);
  expect(ghost.props.free_audio).toEqual(preview);
  expect(ghost.proposePatch).toHaveBeenLastCalledWith({ offer_free: false, version: 1 });
});
