import { describe, expect, it } from 'vitest';

import {
  configResponse,
  fakePages,
  fakePosts,
  fakePostsListScreen,
  renderAdminApp,
  settingsResponse,
} from '@test-utils/acceptance';
import { composeLabsBootOverrides, type BootOverrides } from '@test-utils/acceptance/boot';
import { postsListScreen } from '@/posts/list/posts-list.screen';

/** Resolve an override's response the way the boot table serves it. */
async function bodyOf(override: BootOverrides[keyof BootOverrides]): Promise<unknown> {
  const response = override?.response;
  return typeof response === 'function'
    ? await (response as (request: Request) => unknown)(new Request('https://ghost.test'))
    : response;
}

function labsOf(configBody: unknown): Record<string, boolean> {
  return (configBody as { config: { labs: Record<string, boolean> } }).config.labs;
}

function labsSettingOf(settingsBody: unknown): Record<string, boolean> {
  const { settings } = settingsBody as { settings: Array<{ key: string; value: string }> };
  const entry = settings.find(({ key }) => key === 'labs');
  expect(entry).toBeDefined();
  return JSON.parse(entry!.value) as Record<string, boolean>;
}

describe('labs/boot composition', () => {
  it('merges labs into a browseConfig object override without mutating it', async () => {
    const config = configResponse();
    config.config.hostSettings = { marker: true };
    const snapshot = JSON.stringify(config);

    const composed = composeLabsBootOverrides(
      { automations: true },
      { browseConfig: { response: config } },
    );
    const body = await bodyOf(composed.browseConfig);

    expect(labsOf(body).automations).toBe(true);
    expect((body as { config: { hostSettings: unknown } }).config.hostSettings).toEqual({
      marker: true,
    });
    expect(JSON.stringify(config)).toBe(snapshot);
  });

  it('wins over the same flag inside the override response', async () => {
    const composed = composeLabsBootOverrides(
      { automations: true },
      {
        browseConfig: { response: configResponse({ labs: { automations: false } }) },
        browseSettings: { response: settingsResponse({ labs: { automations: false } }) },
      },
    );

    expect(labsOf(await bodyOf(composed.browseConfig)).automations).toBe(true);
    expect(labsSettingOf(await bodyOf(composed.browseSettings)).automations).toBe(true);
  });

  it('merges labs into a browseSettings override, adding the labs entry when missing', async () => {
    const settings = settingsResponse();
    settings.settings = settings.settings.filter(({ key }) => key !== 'labs');

    const composed = composeLabsBootOverrides(
      { automations: true },
      { browseSettings: { response: settings } },
    );

    expect(labsSettingOf(await bodyOf(composed.browseSettings)).automations).toBe(true);
  });

  it('merges labs into a function response', async () => {
    const composed = composeLabsBootOverrides(
      { automations: true },
      { browseSettings: { response: () => Promise.resolve(settingsResponse()) } },
    );

    expect(labsSettingOf(await bodyOf(composed.browseSettings)).automations).toBe(true);
  });

  it('leaves unrecognized bodies untouched and keeps responseStatus', async () => {
    const errors = { errors: [{ message: 'nope' }] };
    const composed = composeLabsBootOverrides(
      { automations: true },
      { browseConfig: { response: errors, responseStatus: 422 } },
    );

    expect(await bodyOf(composed.browseConfig)).toBe(errors);
    expect(composed.browseConfig?.responseStatus).toBe(422);
  });

  it('compiles the canned responses when boot has no override for the entry', async () => {
    const composed = composeLabsBootOverrides({ automations: true });

    expect(await bodyOf(composed.browseConfig)).toEqual(
      configResponse({ labs: { automations: true } }),
    );
    expect(await bodyOf(composed.browseSettings)).toEqual(
      settingsResponse({ labs: { automations: true } }),
    );
  });
});

describe('renderAdminApp labs + boot', () => {
  // postsListReact gates which implementation serves /posts, so the React
  // screen appearing proves the flag survived the boot overrides.
  it('applies labs flags alongside browseConfig and browseSettings overrides', async () => {
    fakePostsListScreen();
    fakePosts([]);
    fakePages([]);
    await renderAdminApp('/posts', {
      labs: { postsListReact: true },
      boot: {
        browseConfig: { response: configResponse() },
        browseSettings: { response: settingsResponse() },
      },
    });

    await expect.element(postsListScreen.page('posts')).toBeVisible();
  });
});
