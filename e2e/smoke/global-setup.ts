import { AUTH_STATE } from './smoke.playwright.config';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { request } from '@playwright/test';

/**
 * Off-camera plumbing only: make sure the dev site has an owner and hand the
 * smoke run an authenticated storage state. Nothing here is an assertion.
 */
const BASE_URL = process.env.GHOST_BASE_URL || 'http://localhost:2368';

export const OWNER = {
  name: process.env.SMOKE_OWNER_NAME || 'Journey Owner',
  email: process.env.SMOKE_OWNER_EMAIL || 'journey@ghost.org',
  password: process.env.SMOKE_OWNER_PASSWORD || 'test@123@test',
};

export default async function globalSetup() {
  const api = await request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { Origin: BASE_URL },
  });

  // The dev container restarts on every source change, so it can be mid-boot
  // (502/503 through the gateway) when a run starts. Wait it out rather than
  // failing on a transient gateway page.
  const deadline = Date.now() + 120_000;
  let lastStatus = 0;
  for (;;) {
    try {
      const probe = await api.get('/ghost/api/admin/site/');
      lastStatus = probe.status();
      if (probe.ok()) {
        break;
      }
    } catch {
      lastStatus = 0;
    }
    if (Date.now() > deadline) {
      throw new Error(
        `Ghost at ${BASE_URL} never became ready (last status ${lastStatus}). ` +
          'Start the dev stack with `pnpm dev:stripe` (or `pnpm dev`) from this worktree.',
      );
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
  }

  const setupStatus = await api.get('/ghost/api/admin/authentication/setup/');
  const setupBody = (await setupStatus.json()) as { setup?: { status: boolean }[] };

  if (setupBody.setup?.[0]?.status !== true) {
    const created = await api.post('/ghost/api/admin/authentication/setup/', {
      data: {
        setup: [
          {
            name: OWNER.name,
            email: OWNER.email,
            password: OWNER.password,
            blogTitle: 'Custom Fields Smoke',
          },
        ],
      },
    });
    if (!created.ok()) {
      throw new Error(`Ghost owner setup failed: ${created.status()} ${await created.text()}`);
    }
    // eslint-disable-next-line no-console
    console.log(`[smoke] created owner ${OWNER.email}`);
  }

  const session = await api.post('/ghost/api/admin/session/', {
    data: { username: OWNER.email, password: OWNER.password },
  });
  if (!session.ok()) {
    throw new Error(
      `Could not sign in as ${OWNER.email}: ${session.status()} ${await session.text()}\n` +
        'If this dev site already has a different owner, set SMOKE_OWNER_EMAIL / ' +
        'SMOKE_OWNER_PASSWORD to credentials that work.',
    );
  }

  mkdirSync(dirname(AUTH_STATE), { recursive: true });
  await api.storageState({ path: AUTH_STATE });

  // Step 1 asserts what a site WITHOUT the flag looks like, and step 2 asserts an
  // empty field list — both of which are only meaningful on a site that defines
  // no fields. So clear out whatever a previous run left behind. Destructive, and
  // deliberately so: this dev site is the smoke run's to own.
  await api.put('/ghost/api/admin/settings/', {
    data: { settings: [{ key: 'labs', value: JSON.stringify({ membersCustomFields: true }) }] },
  });
  const existing = await api.get(
    `/ghost/api/admin/members/metafields/custom/?filter=${encodeURIComponent('status:[active,archived]')}`,
  );
  const fields = ((await existing.json()) as { members_metafields?: { key: string }[] })
    .members_metafields;
  for (const field of fields ?? []) {
    await api.put(`/ghost/api/admin/members/metafields/custom/${field.key}/`, {
      data: { members_metafields: [{ status: 'archived' }] },
    });
    await api.delete(`/ghost/api/admin/members/metafields/custom/${field.key}/`);
  }
  if (fields?.length) {
    // eslint-disable-next-line no-console
    console.log(`[smoke] cleared ${fields.length} leftover custom field(s)`);
  }

  // Saved views accumulate in a single site setting and clutter the sidebar,
  // which is where the smoke run clicks them. Start each run from none.
  await api.put('/ghost/api/admin/settings/', {
    data: { settings: [{ key: 'shared_views', value: JSON.stringify([]) }] },
  });

  await api.dispose();

  // eslint-disable-next-line no-console
  console.log(`[smoke] authenticated against ${BASE_URL}`);
}
