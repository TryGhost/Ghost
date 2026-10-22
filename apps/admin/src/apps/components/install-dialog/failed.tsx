import React from 'react';
import {
  Button,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tryghost/shade/components';
import { Text } from '@tryghost/shade/primitives';
import type { InstallFailure } from '@/apps/lib/install-failure';

/** What the publisher was doing when it failed. */
export type Attempted = 'check' | 'install' | 'approve';

interface FailedProps {
  failure: InstallFailure;
  attempted: Attempted;
  onClose: () => void;
  /** Only for failures trying again can fix. */
  onRetry?: () => void;
}

const TITLES: Record<Attempted, string> = {
  check: 'Couldn’t load app details',
  install: 'Couldn’t install this app',
  approve: 'Couldn’t approve the changes',
};

// Whatever the publisher was doing, the app itself can't be installed.
const REFUSED_TITLE = 'Can’t install this app';

function titleOf(failure: InstallFailure, attempted: Attempted): string {
  if (failure.kind === 'another-developer' || failure.kind === 'unconfirmed') {
    return REFUSED_TITLE;
  }
  return TITLES[attempted];
}

function describe(failure: InstallFailure): string {
  switch (failure.kind) {
    case 'unreachable':
      return 'The app didn’t respond. It might be down or having a temporary problem.';
    case 'another-developer':
      return 'This link is for an app that’s already installed, but it doesn’t come from the same developer. If you weren’t expecting it, you can ignore it.';
    case 'unconfirmed':
      return 'Ghost couldn’t confirm it comes from its developer.';
    case 'problems':
      return 'Send these details to the app’s developer.';
    case 'incomplete-link':
      return 'This install link doesn’t say which app to install. Ask whoever sent it for the full link.';
    case 'error':
      return failure.message;
  }
}

/** Why it stopped, with Try again when that could help. */
export const Failed: React.FC<FailedProps> = ({ failure, attempted, onClose, onRetry }) => {
  const retryable = onRetry && (failure.kind === 'unreachable' || failure.kind === 'error');
  return (
    <>
      {/* The details belong to the copy above them, closer than the dialog's own gap. */}
      <div className="grid gap-3">
        <DialogHeader className="gap-3">
          <DialogTitle>{titleOf(failure, attempted)}</DialogTitle>
          {/* Ghost's explanation starts with the same sentence, so it stands in for it. */}
          {failure.kind === 'unconfirmed' && failure.detail ? (
            <DialogDescription className="wrap-anywhere" data-testid="app-install-unconfirmed">
              {failure.detail}
            </DialogDescription>
          ) : (
            <DialogDescription>{describe(failure)}</DialogDescription>
          )}
        </DialogHeader>
        {failure.kind === 'problems' && (
          <ul className="border-t" data-testid="app-install-problems">
            {failure.problems.map((problem) => (
              <li key={`${problem.title}:${problem.detail}`} className="border-b py-3">
                <Text as="div" weight="semibold">
                  {problem.title}
                </Text>
                <Text as="div" className="break-all" size="sm" tone="secondary">
                  {problem.detail}
                </Text>
              </li>
            ))}
          </ul>
        )}
        {failure.kind === 'unreachable' && failure.detail && (
          <Text
            as="p"
            className="break-all"
            data-testid="app-install-unreachable"
            size="sm"
            tone="secondary"
          >
            {failure.detail}
          </Text>
        )}
      </div>
      <DialogFooter>
        {retryable ? (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onRetry}>Try again</Button>
          </>
        ) : (
          <Button onClick={onClose}>OK</Button>
        )}
      </DialogFooter>
    </>
  );
};
