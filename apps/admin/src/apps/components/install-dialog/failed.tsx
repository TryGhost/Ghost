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

function describe(failure: InstallFailure): string {
  switch (failure.kind) {
    case 'unreachable':
      return 'The app didn’t respond. It might be down or having a temporary problem.';
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
          <DialogTitle>{TITLES[attempted]}</DialogTitle>
          <DialogDescription>{describe(failure)}</DialogDescription>
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
