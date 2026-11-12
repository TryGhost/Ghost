import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import { fakeAdminEndpoint, fakeSettingsScreens, renderAdminApp } from '@test-utils/acceptance';

const JOB_ID = '4f1b0c5e-8d3a-4b6e-9c2d-1a2b3c4d5e6f';
const TIMESTAMP = '2026-10-14T12:00:00.000Z';

const screen = {
  aboutVersion: () => page.getByText('Version:', { exact: false }).first(),
  panel: () => page.getByTestId('ghost-updates'),
  oneClick: () => page.getByTestId('one-click-update'),
  manual: () => page.getByTestId('manual-update'),
  confirm: () => page.getByTestId('confirm-update'),
  job: () => page.getByTestId('update-job'),
  availability: () => page.getByTestId('update-availability'),
  error: () => page.getByTestId('update-error'),
  retryAfter: () => page.getByTestId('update-retry-after'),
  updateButton: () => page.getByRole('button', { name: 'Update', exact: true }),
  updateNowButton: () => page.getByRole('button', { name: 'Update now' }),
};

function readyStatus(overrides: Record<string, unknown> = {}) {
  return {
    upgrades: [
      {
        supported: true,
        availability: 'ready',
        backup_required: true,
        current_version: '6.70.0',
        one_click: [{ component: 'ghost', from_version: '6.70.0', to_version: '6.71.0' }],
        manual: [
          {
            component: 'stack',
            from_version: '1.2.0',
            to_version: '1.3.0',
            reason: 'Stack updates replace the update service itself.',
            steps: ['In the site directory, run `./ghost-docker self-update`'],
          },
        ],
        active_job_id: null,
        ...overrides,
      },
    ],
  };
}

function job(state: string, extra: Record<string, unknown> = {}) {
  return {
    upgrades: [
      {
        id: JOB_ID,
        state,
        component: 'ghost',
        from_version: '6.70.0',
        to_version: '6.71.0',
        created_at: TIMESTAMP,
        updated_at: TIMESTAMP,
        ...extra,
      },
    ],
  };
}

function jsonResponse(body: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

// Answers job lookups from a script, repeating its last entry.
function fakeJobLookups(responses: Array<object | Response>) {
  let index = 0;
  return fakeAdminEndpoint('GET', `/upgrades/${JOB_ID}/`, () => {
    const response = responses[Math.min(index, responses.length - 1)];
    index += 1;
    return response;
  });
}

describe('Ghost updates', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // About opens over the Settings page, which loads its own sections.
    fakeSettingsScreens();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('offers nothing on a core without the upgrade endpoints', async () => {
    fakeAdminEndpoint('GET', '/upgrades/', jsonResponse({ errors: [] }, 404));
    await renderAdminApp('/settings/about');

    await expect.element(screen.aboutVersion()).toBeVisible();
    await expect.element(screen.panel()).not.toBeInTheDocument();
  });

  it('offers nothing when the host does not support updates', async () => {
    const status = fakeAdminEndpoint('GET', '/upgrades/', {
      upgrades: [{ supported: false, reason: 'not-configured' }],
    });
    await renderAdminApp('/settings/about');

    await expect.poll(() => status.requests.length).toBeGreaterThan(0);
    await expect.element(screen.aboutVersion()).toBeVisible();
    await expect.element(screen.panel()).not.toBeInTheDocument();
  });

  it('shows one-click and manual updates by component', async () => {
    fakeAdminEndpoint('GET', '/upgrades/', readyStatus());
    await renderAdminApp('/settings/about');

    await expect.element(screen.oneClick()).toHaveTextContent('ghost 6.70.0 → 6.71.0');
    await expect.element(screen.manual()).toHaveTextContent('stack 1.2.0 → 1.3.0');
    await expect.element(screen.manual()).toHaveTextContent('./ghost-docker self-update');
  });

  it('shows only the backticked part of a host step as code', async () => {
    fakeAdminEndpoint(
      'GET',
      '/upgrades/',
      readyStatus({
        manual: [
          {
            component: 'stack',
            from_version: '1.2.0',
            to_version: '1.3.0',
            reason: 'Stack updates replace the update service itself.',
            steps: [
              'In the site directory, run `./ghost-docker self-update`',
              'Then <b>reload</b>`',
            ],
          },
        ],
      }),
    );
    await renderAdminApp('/settings/about');

    const steps = page.getByTestId('manual-update-steps');
    await expect.element(steps.getByRole('code')).toHaveTextContent('./ghost-docker self-update');
    await expect.element(steps).toHaveTextContent('In the site directory, run');
    // Host text is never markup, and an unmatched backtick stays literal.
    await expect.element(steps).toHaveTextContent('Then <b>reload</b>`');
    expect(steps.element().querySelectorAll('code, b')).toHaveLength(1);
  });

  it('confirms the backup policy the host reports before requesting', async () => {
    fakeAdminEndpoint('GET', '/upgrades/', readyStatus({ backup_required: false }));
    const request = fakeAdminEndpoint('POST', '/upgrades/', job('pending'));
    await renderAdminApp('/settings/about');

    await screen.updateButton().click();
    await expect.element(screen.confirm()).toHaveTextContent('Your site is not backed up');
    expect(request.requests).toHaveLength(0);
  });

  it('follows a job across the restart until it finishes', async () => {
    fakeAdminEndpoint('GET', '/upgrades/', readyStatus());
    const request = fakeAdminEndpoint('POST', '/upgrades/', job('pending'));
    const lookups = fakeJobLookups([
      job('backing-up'),
      job('restarting'),
      // Ghost is down while it restarts.
      jsonResponse({ errors: [] }, 502),
      jsonResponse({ errors: [] }, 502),
      job('done'),
    ]);
    await renderAdminApp('/settings/about');

    await screen.updateButton().click();
    await expect.element(screen.confirm()).toHaveTextContent('Your site is backed up first');
    await screen.updateNowButton().click();

    await expect.element(screen.job()).toHaveTextContent('Updated to 6.71.0');
    await expect.element(page.getByRole('button', { name: 'Reload Admin' })).toBeVisible();
    // The success is shown here, but not kept for the reload it asks for.
    expect(window.localStorage.getItem('ghost-admin:upgrade-job')).toBeNull();

    const body = request.lastRequest?.body as {
      upgrades: Array<{ component: string; to_version: string; idempotency_key: string }>;
    };
    expect(body.upgrades[0]).toMatchObject({ component: 'ghost', to_version: '6.71.0' });
    expect(body.upgrades[0].idempotency_key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(lookups.requests.length).toBeGreaterThanOrEqual(5);
  });

  it('picks up a job the host is already running', async () => {
    fakeAdminEndpoint(
      'GET',
      '/upgrades/',
      readyStatus({ availability: 'busy', active_job_id: JOB_ID }),
    );
    fakeJobLookups([job('pulling')]);
    await renderAdminApp('/settings/about');

    await expect.element(screen.job()).toHaveTextContent('Downloading the new version');
    await expect.element(screen.oneClick()).not.toBeInTheDocument();
    // The host is busy with this job, which the panel already shows.
    await expect.element(screen.availability()).not.toBeInTheDocument();
  });

  it('shows what to do when the update needs the operator', async () => {
    window.localStorage.setItem('ghost-admin:upgrade-job', JOB_ID);
    fakeAdminEndpoint('GET', '/upgrades/', readyStatus());
    fakeJobLookups([
      job('needs-operator', {
        diagnostics: [
          {
            source: 'host',
            code: 'restore-failed',
            severity: 'error',
            message: 'Restore the backup in /srv/backups/1.',
          },
        ],
      }),
    ]);
    await renderAdminApp('/settings/about');

    await expect.element(screen.job()).toHaveTextContent('The update needs attention');
    await expect.element(screen.job()).toHaveTextContent('Restore the backup in /srv/backups/1.');

    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect.element(screen.job()).not.toBeInTheDocument();
    expect(window.localStorage.getItem('ghost-admin:upgrade-job')).toBeNull();
  });

  it('keeps the line breaks and commands of multi-step guidance', async () => {
    window.localStorage.setItem('ghost-admin:upgrade-job', JOB_ID);
    fakeAdminEndpoint('GET', '/upgrades/', readyStatus());
    fakeJobLookups([
      job('interrupted', {
        diagnostics: [
          {
            source: 'ghost-docker',
            code: 'interrupted',
            severity: 'error',
            message: 'The upgrade supervisor stopped while this job was restarting.',
            details: 'In the site directory:\n  `./ghost-docker check`\n  `rm .ghost-docker.lock`',
          },
        ],
      }),
    ]);
    await renderAdminApp('/settings/about');

    await expect.element(screen.job()).toHaveTextContent('The update was interrupted');
    const commands = screen.job().getByRole('code');
    await expect.element(commands.first()).toHaveTextContent('./ghost-docker check');
    await expect.element(commands.last()).toHaveTextContent('rm .ghost-docker.lock');
    const details = commands.first().element().parentElement;
    expect(details?.textContent).toContain('In the site directory:\n');
    expect(details && getComputedStyle(details).whiteSpace).toBe('pre-wrap');
  });

  it('keeps following a job while the status cannot be read', async () => {
    window.localStorage.setItem('ghost-admin:upgrade-job', JOB_ID);
    // 500, not 503: the framework retries a 503 past the end of the test.
    fakeAdminEndpoint('GET', '/upgrades/', jsonResponse({ errors: [] }, 500));
    fakeJobLookups([job('restarting')]);
    await renderAdminApp('/settings/about');

    await expect.element(screen.job()).toHaveTextContent('Restarting Ghost');
    await expect.element(screen.oneClick()).not.toBeInTheDocument();
  });

  it('shows nothing on an older core, even with a remembered job', async () => {
    window.localStorage.setItem('ghost-admin:upgrade-job', JOB_ID);
    const status = fakeAdminEndpoint('GET', '/upgrades/', jsonResponse({ errors: [] }, 404));
    fakeJobLookups([jsonResponse({ errors: [] }, 404)]);
    await renderAdminApp('/settings/about');

    await expect.poll(() => status.requests.length).toBeGreaterThan(0);
    await expect.element(screen.aboutVersion()).toBeVisible();
    await expect.element(screen.panel()).not.toBeInTheDocument();
  });

  it('reports a rolled-back update as failed', async () => {
    window.localStorage.setItem('ghost-admin:upgrade-job', JOB_ID);
    fakeAdminEndpoint('GET', '/upgrades/', readyStatus());
    fakeJobLookups([job('restored')]);
    await renderAdminApp('/settings/about');

    await expect.element(screen.job()).toHaveTextContent('The update failed');
    await expect.element(screen.job()).toHaveTextContent('restored to 6.70.0');
  });

  it('does not show a finished update again after the reload', async () => {
    window.localStorage.setItem('ghost-admin:upgrade-job', JOB_ID);
    fakeAdminEndpoint('GET', '/upgrades/', readyStatus({ one_click: [] }));
    const lookups = fakeJobLookups([job('done')]);
    await renderAdminApp('/settings/about');

    await expect.poll(() => lookups.requests.length).toBeGreaterThan(0);
    // The request is recorded before its response is handled; wait for the done job to clear storage.
    await expect.poll(() => window.localStorage.getItem('ghost-admin:upgrade-job')).toBeNull();
    await expect.element(screen.panel()).toBeVisible();
    await expect.element(screen.job()).not.toBeInTheDocument();
  });

  it('settles when status still names a job that has already finished', async () => {
    const status = fakeAdminEndpoint(
      'GET',
      '/upgrades/',
      readyStatus({ availability: 'busy', active_job_id: JOB_ID }),
    );
    const lookups = fakeJobLookups([job('done')]);
    await renderAdminApp('/settings/about');

    await expect.poll(() => lookups.requests.length).toBeGreaterThan(0);
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
    await expect.element(screen.job()).not.toBeInTheDocument();
    expect(lookups.requests.length).toBe(1);
    expect(status.requests.length).toBeLessThanOrEqual(2);
  });

  it('shows the accepted job while Ghost cannot answer yet', async () => {
    fakeAdminEndpoint('GET', '/upgrades/', readyStatus());
    fakeAdminEndpoint('POST', '/upgrades/', jsonResponse(job('pending'), 202));
    fakeJobLookups([
      jsonResponse({ errors: [] }, 502),
      jsonResponse({ errors: [] }, 502),
      job('done'),
    ]);
    await renderAdminApp('/settings/about');

    await screen.updateButton().click();
    await screen.updateNowButton().click();

    await expect.element(screen.job()).toBeVisible();
    await expect.element(screen.job()).toHaveTextContent('Updated to 6.71.0');
    await expect.element(page.getByRole('button', { name: 'Reload Admin' })).toBeVisible();
  });

  it('offers Reload when the first lookup already finds the update done', async () => {
    fakeAdminEndpoint('GET', '/upgrades/', readyStatus());
    fakeAdminEndpoint('POST', '/upgrades/', jsonResponse(job('pending'), 202));
    fakeJobLookups([job('done')]);
    await renderAdminApp('/settings/about');

    await screen.updateButton().click();
    await screen.updateNowButton().click();

    await expect.element(screen.job()).toHaveTextContent('Updated to 6.71.0');
    await expect.element(page.getByRole('button', { name: 'Reload Admin' })).toBeVisible();
  });

  it('keeps a dismissed stalled job dismissed', async () => {
    fakeAdminEndpoint(
      'GET',
      '/upgrades/',
      readyStatus({ availability: 'busy', active_job_id: JOB_ID }),
    );
    const lookups = fakeJobLookups([job('restarting'), jsonResponse({ errors: [] }, 502)]);
    await renderAdminApp('/settings/about');

    await expect.element(screen.job()).toHaveTextContent('Lost contact with Ghost');
    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect.element(screen.job()).not.toBeInTheDocument();

    const after = lookups.requests.length;
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
    await expect.element(screen.job()).not.toBeInTheDocument();
    expect(lookups.requests.length).toBe(after);
  });

  it('reports a job as stalled when Ghost does not come back', async () => {
    window.localStorage.setItem('ghost-admin:upgrade-job', JOB_ID);
    fakeAdminEndpoint('GET', '/upgrades/', readyStatus());
    fakeJobLookups([job('restarting'), jsonResponse({ errors: [] }, 502)]);
    await renderAdminApp('/settings/about');

    await expect.element(screen.job()).toHaveTextContent('Lost contact with Ghost');
  });

  it('keeps polling through rate limits past the reconnect window', async () => {
    fakeAdminEndpoint('GET', '/upgrades/', readyStatus());
    window.localStorage.setItem('ghost-admin:upgrade-job', JOB_ID);
    const lookups = fakeJobLookups([
      job('restarting'),
      jsonResponse({ errors: [{ message: 'Too many requests.' }] }, 429, { 'Retry-After': '1' }),
    ]);
    await renderAdminApp('/settings/about');

    await expect.element(screen.job()).toHaveTextContent('Restarting Ghost');
    // Retry-After outlasts the reconnect window, so a lookup after the second 429 proves polling continued.
    await expect.poll(() => lookups.requests.length, { timeout: 5000 }).toBeGreaterThanOrEqual(4);
    await expect.element(screen.job()).not.toHaveTextContent('Lost contact with Ghost');
  });

  it('waits for Retry-After and retries with the same key', async () => {
    fakeAdminEndpoint('GET', '/upgrades/', readyStatus());
    let attempts = 0;
    const request = fakeAdminEndpoint('POST', '/upgrades/', () => {
      attempts += 1;
      return attempts === 1
        ? jsonResponse({ errors: [{ message: 'Too many update requests.' }] }, 429, {
            'Retry-After': '1',
          })
        : jsonResponse(job('pending'), 202);
    });
    fakeJobLookups([job('pending')]);
    await renderAdminApp('/settings/about');

    await screen.updateButton().click();
    await screen.updateNowButton().click();
    await expect.element(screen.retryAfter()).toBeVisible();
    await expect.element(screen.updateNowButton()).toBeDisabled();

    await expect.element(screen.updateNowButton()).toBeEnabled();
    await screen.updateNowButton().click();
    await expect.element(screen.job()).toHaveTextContent('Waiting for the update to start');

    const keys = request.requests.map(
      (captured) =>
        (captured.body as { upgrades: Array<{ idempotency_key: string }> }).upgrades[0]
          .idempotency_key,
    );
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it('shows host rejections with their diagnostics', async () => {
    fakeAdminEndpoint('GET', '/upgrades/', readyStatus());
    fakeAdminEndpoint(
      'POST',
      '/upgrades/',
      jsonResponse(
        {
          errors: [
            {
              code: 'UPGRADE_TARGET_UNAPPROVED',
              message: 'This update is not available as a one-click update.',
              details: {
                diagnostics: [
                  {
                    source: 'host',
                    code: 'major',
                    severity: 'error',
                    message: 'Major updates must be run on the host.',
                  },
                ],
              },
            },
          ],
        },
        422,
      ),
    );
    await renderAdminApp('/settings/about');

    await screen.updateButton().click();
    await screen.updateNowButton().click();

    await expect.element(screen.error()).toHaveTextContent('not available as a one-click update');
    await expect
      .element(screen.error())
      .toHaveTextContent('Major updates must be run on the host.');
  });

  it('shows a generic message for an error Ghost did not write', async () => {
    fakeAdminEndpoint('GET', '/upgrades/', readyStatus());
    fakeAdminEndpoint(
      'POST',
      '/upgrades/',
      jsonResponse({ errors: [{ message: 'proxy: upstream /var/run/x refused' }] }, 400),
    );
    await renderAdminApp('/settings/about');

    await screen.updateButton().click();
    await screen.updateNowButton().click();

    await expect.element(screen.error()).toHaveTextContent('could not be requested');
    await expect.element(screen.error()).not.toHaveTextContent('upstream');
  });

  it('reuses the request key after an unanswered request, even across Cancel', async () => {
    fakeAdminEndpoint('GET', '/upgrades/', readyStatus());
    let attempts = 0;
    const request = fakeAdminEndpoint('POST', '/upgrades/', () => {
      attempts += 1;
      // 500, not 503: the framework retries a 503 past the end of the test.
      return attempts === 1 ? jsonResponse({ errors: [] }, 500) : jsonResponse(job('pending'), 202);
    });
    fakeJobLookups([job('pending')]);
    await renderAdminApp('/settings/about');

    await screen.updateButton().click();
    await screen.updateNowButton().click();
    await expect.element(screen.error()).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await screen.updateButton().click();
    await screen.updateNowButton().click();
    await expect.element(screen.job()).toHaveTextContent('Waiting for the update to start');

    const keys = request.requests.map(
      (captured) =>
        (captured.body as { upgrades: Array<{ idempotency_key: string }> }).upgrades[0]
          .idempotency_key,
    );
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it('explains when the update service has stopped responding', async () => {
    fakeAdminEndpoint('GET', '/upgrades/', readyStatus({ availability: 'stale', one_click: [] }));
    await renderAdminApp('/settings/about');

    await expect.element(screen.availability()).toHaveTextContent('stopped responding');
  });
});
