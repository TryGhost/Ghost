import { useEffect, useState } from 'react';
import { APIError, JSONError } from '@tryghost/admin-x-framework/errors';
import { Banner, Button, Link, LoadingIndicator } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import {
  upgradeDiagnosticsSchema,
  useBrowseUpgradeStatus,
  useRequestUpgrade,
} from '@tryghost/admin-x-framework/api/upgrades';
import { z } from 'zod';
import type {
  ManualUpdate,
  OneClickUpdate,
  UpgradeAvailability,
  UpgradeDiagnostic,
} from '@tryghost/admin-x-framework/api/upgrades';
import { STALLED_VIEW, jobView } from './job-view';
import { retryAfterMs, useUpgradeJob } from './use-upgrade-job';

const availabilityNotices: Record<Exclude<UpgradeAvailability, 'ready'>, string> = {
  busy: 'The update service is busy with another update. Try again when it has finished.',
  unavailable: 'Updates are temporarily unavailable. Try again later.',
  stale: "The update service has stopped responding. Check that it's running on your server.",
  incompatible:
    'This version of Ghost needs a newer update service. Update it on your server, then try again.',
};

/** Host text, with `backticked` spans shown as inline code. Never parsed as HTML. */
function HostText({ text }: { text: string }) {
  const parts = text.split(/`([^`]+)`/);

  return (
    <>
      {parts.map((part, idx) =>
        idx % 2 === 1 ? (
          // eslint-disable-next-line react/no-array-index-key -- parts are derived from text and stateless
          <code key={idx} className="rounded-sm bg-surface-elevated px-1 font-mono text-xs">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

function Diagnostics({ diagnostics }: { diagnostics?: UpgradeDiagnostic[] }) {
  if (!diagnostics?.length) {
    return null;
  }
  return (
    <ul className="list-disc pl-5 text-sm">
      {diagnostics.map((diagnostic) => (
        <li key={`${diagnostic.source}:${diagnostic.code}:${diagnostic.message}`}>
          <HostText text={diagnostic.message} />
          {diagnostic.details && (
            // Hosts put multi-step guidance on separate lines.
            <span className="block whitespace-pre-wrap">
              <HostText text={diagnostic.details} />
            </span>
          )}
          {diagnostic.help && (
            <>
              {' '}
              <Link href={diagnostic.help} external>
                Learn more
              </Link>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

// Only Ghost's own upgrade errors are written for people; anything else is unknown.
const UpgradeError = z.object({
  code: z.string().startsWith('UPGRADE_'),
  message: z.string(),
  details: z
    .object({ diagnostics: upgradeDiagnosticsSchema.optional() })
    .optional()
    .catch(undefined),
});

function updateKey(update: OneClickUpdate) {
  return `${update.component}:${update.to_version}`;
}

function updateLabel(update: OneClickUpdate) {
  return `${update.component} ${update.from_version} → ${update.to_version}`;
}

function ManualUpdates({ updates }: { updates: ManualUpdate[] }) {
  if (!updates.length) {
    return null;
  }
  return (
    <Stack gap="sm">
      {updates.map((update) => (
        <Banner key={updateKey(update)} data-testid="manual-update" variant="default">
          <Stack gap="xs">
            <Text weight="semibold">Update on your server</Text>
            <Text size="sm">{updateLabel(update)}</Text>
            <Text size="sm" tone="secondary">
              <HostText text={update.reason} />
            </Text>
            {update.steps.length > 0 && (
              <ol
                className={update.steps.length > 1 ? 'list-decimal pl-5 text-sm' : 'text-sm'}
                data-testid="manual-update-steps"
              >
                {update.steps.map((step) => (
                  <li key={step}>
                    <HostText text={step} />
                  </li>
                ))}
              </ol>
            )}
          </Stack>
        </Banner>
      ))}
    </Stack>
  );
}

function ConfirmUpdate({
  update,
  backupRequired,
  disabled,
  isSubmitting,
  onCancel,
  onConfirm,
}: {
  update: OneClickUpdate;
  backupRequired: boolean;
  disabled: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Banner data-testid="confirm-update" variant="warning">
      <Stack gap="sm">
        <Text weight="semibold">Update {updateLabel(update)}?</Text>
        <Text size="sm">
          Your site will be unavailable for a short time while Ghost restarts.{' '}
          {backupRequired
            ? 'Your site is backed up first, and the update service tries to restore it automatically if the update fails.'
            : 'Your site is not backed up before updating, so make sure you have a recent backup.'}
        </Text>
        <Inline gap="sm">
          <Button disabled={disabled || isSubmitting} size="sm" onClick={onConfirm}>
            {isSubmitting ? 'Requesting…' : 'Update now'}
          </Button>
          <Button disabled={isSubmitting} size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </Inline>
      </Stack>
    </Banner>
  );
}

type Intent = { update: OneClickUpdate; key: string };

/**
 * Host-managed Ghost updates. Renders nothing on cores without the endpoints and
 * on hosts that do not support updating from Admin.
 */
function GhostUpdates() {
  const statusQuery = useBrowseUpgradeStatus({
    defaultErrorHandler: false,
    retry: false,
    refetchOnWindowFocus: true,
  });
  const status = statusQuery.data?.upgrades[0];
  const supported = status?.supported ? status : undefined;

  const tracking = useUpgradeJob({
    activeJobId: supported?.active_job_id,
    pollAfterMs: supported?.poll_after_ms,
  });
  const { mutateAsync: requestUpgrade, isPending: isSubmitting } = useRequestUpgrade();

  // Kept until the host's outcome is known, so a retry after a lost response or 429
  // reuses the same intent rather than requesting a second update.
  const [intent, setIntent] = useState<Intent | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<{
    message: string;
    diagnostics?: UpgradeDiagnostic[];
  } | null>(null);
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!retryAt) {
      return;
    }
    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= retryAt) {
        setRetryAt(null);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  const view = tracking.stalled ? STALLED_VIEW : tracking.job && jobView(tracking.job);
  const jobFinished = !tracking.jobId || view?.final === true;
  const { refetch: refetchStatus } = statusQuery;

  // A finished job can change the current version and the available updates.
  useEffect(() => {
    if (view?.final) {
      void refetchStatus();
    }
  }, [view?.final, refetchStatus]);

  // Hide on older cores (404) and unsupported hosts, but keep following a job while
  // the status itself can't be read, e.g. while Ghost restarts.
  const olderCore =
    statusQuery.error instanceof APIError && statusQuery.error.response?.status === 404;
  if (!supported && (!tracking.jobId || olderCore || status?.supported === false)) {
    return null;
  }

  const submit = async (update: OneClickUpdate) => {
    const current =
      intent && updateKey(intent.update) === updateKey(update)
        ? intent
        : { update, key: window.crypto.randomUUID() };
    setIntent(current);
    setRequestError(null);
    try {
      const response = await requestUpgrade({
        component: update.component,
        to_version: update.to_version,
        idempotency_key: current.key,
      });
      tracking.track(response.upgrades[0]);
      setIntent(null);
      setConfirming(null);
    } catch (error) {
      const waitMs = retryAfterMs(error);
      if (waitMs !== null) {
        setRetryAt(Date.now() + waitMs);
        setNow(Date.now());
        return;
      }
      const known =
        error instanceof JSONError
          ? UpgradeError.safeParse(error.data?.errors?.[0]).data
          : undefined;
      setRequestError({
        message: known?.message ?? 'The update could not be requested. Try again later.',
        diagnostics: known?.details?.diagnostics,
      });
      // A 4xx is the host's definite answer; after a 5xx or no response, the request may
      // still have been accepted, so a retry must reuse its key.
      const httpStatus = error instanceof APIError ? error.response?.status : undefined;
      if (httpStatus !== undefined && httpStatus < 500) {
        setIntent(null);
      }
      void refetchStatus();
    }
  };

  const retrySeconds = retryAt ? Math.max(1, Math.ceil((retryAt - now) / 1000)) : 0;
  const canRequest = supported?.availability === 'ready' && jobFinished && !retryAt;

  return (
    <Stack data-testid="ghost-updates" gap="sm">
      {tracking.jobId && view && (
        <Banner data-testid="update-job" role="status" variant={view.variant}>
          <Stack gap="xs">
            <Inline gap="sm">
              {!view.final && <LoadingIndicator size="sm" />}
              <Text weight="semibold">{view.title}</Text>
            </Inline>
            {view.description && <Text size="sm">{view.description}</Text>}
            {tracking.reconnecting && !view.final && (
              <Text size="sm" tone="secondary">
                Waiting for Ghost to come back online…
              </Text>
            )}
            {tracking.job && 'diagnostics' in tracking.job && (
              <Diagnostics diagnostics={tracking.job.diagnostics} />
            )}
            {view.final && (
              <Inline gap="sm">
                {tracking.job?.state === 'done' && (
                  <Button size="sm" onClick={() => window.location.reload()}>
                    Reload Admin
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={tracking.dismiss}>
                  Dismiss
                </Button>
              </Inline>
            )}
          </Stack>
        </Banner>
      )}

      {supported &&
        supported.availability !== 'ready' &&
        !(supported.availability === 'busy' && !jobFinished) && (
          <Banner data-testid="update-availability" variant="warning">
            <Stack gap="xs">
              <Text size="sm">{availabilityNotices[supported.availability]}</Text>
              <Diagnostics diagnostics={supported.diagnostics} />
            </Stack>
          </Banner>
        )}

      {requestError && (
        <Banner data-testid="update-error" role="alert" variant="destructive">
          <Stack gap="xs">
            <Text size="sm">{requestError.message}</Text>
            <Diagnostics diagnostics={requestError.diagnostics} />
          </Stack>
        </Banner>
      )}

      {retryAt && (
        <Text data-testid="update-retry-after" size="sm" tone="secondary">
          Too many update requests. You can try again in {retrySeconds}s.
        </Text>
      )}

      {supported &&
        jobFinished &&
        supported.one_click.map((update) =>
          confirming === updateKey(update) ? (
            <ConfirmUpdate
              key={updateKey(update)}
              backupRequired={supported.backup_required === true}
              disabled={!canRequest}
              isSubmitting={isSubmitting}
              update={update}
              // The intent and its key outlive Cancel: an unanswered request may still run.
              onCancel={() => setConfirming(null)}
              onConfirm={() => void submit(update)}
            />
          ) : (
            <Banner key={updateKey(update)} data-testid="one-click-update" variant="success">
              <Inline gap="sm" justify="between">
                <Stack gap="none">
                  <Text weight="semibold">Update available</Text>
                  <Text size="sm">{updateLabel(update)}</Text>
                </Stack>
                <Button
                  disabled={!canRequest}
                  size="sm"
                  onClick={() => setConfirming(updateKey(update))}
                >
                  Update
                </Button>
              </Inline>
            </Banner>
          ),
        )}

      {supported && <ManualUpdates updates={supported.manual} />}
    </Stack>
  );
}

export default GhostUpdates;
