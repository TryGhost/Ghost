import React, { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  LoadingIndicator,
  Skeleton,
} from '@tryghost/shade/components';
import {
  HANDLE_REGEX,
  getMoveErrorMessage,
  getPrefillableHandle,
  handlesEqual,
  normalizeHandle,
} from './utils';
import { LucideIcon } from '@tryghost/shade/utils';
import {
  useAccountForUser,
  useAccountMigrationForUser,
  useMoveAccountMutationForUser,
} from '@hooks/use-activity-pub-queries';

const ExportAccount: React.FC = () => {
  const { data: account, isLoading: isLoadingAccount } = useAccountForUser('index', 'me');
  const {
    data: migration,
    isError: hasMigrationLoadError,
    isLoading: isLoadingMigration,
    refetch: refetchMigration,
  } = useAccountMigrationForUser('index');
  const moveAccountMutation = useMoveAccountMutationForUser('index');
  const [targetHandle, setTargetHandle] = useState('');
  const [exportFormReady, setExportFormReady] = useState(false);
  const [moveConfirmOpen, setMoveConfirmOpen] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const ownHandle = account?.handle?.trim() || '';
  const destinationHandle = migration?.targetApId
    ? getPrefillableHandle(migration.targetApId)
    : null;
  const normalizedDestination = normalizeHandle(targetHandle);
  const showDestinationForm = exportFormReady || Boolean(migration?.targetApId);

  useEffect(() => {
    if (!migration?.targetApId) {
      return;
    }

    const prefill = getPrefillableHandle(migration.targetApId);
    if (!prefill) {
      return;
    }

    setTargetHandle((current) => current || prefill);
  }, [migration?.targetApId]);

  const handleCopy = async () => {
    if (!ownHandle) {
      return;
    }

    setCopied(true);
    await navigator.clipboard.writeText(ownHandle);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleMoveSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (moveAccountMutation.isPending) {
      return;
    }
    if (!HANDLE_REGEX.test(targetHandle.trim())) {
      setMoveError('Enter a valid destination handle, like new@mastodon.social.');
      return;
    }
    if (ownHandle && handlesEqual(targetHandle, ownHandle)) {
      setMoveError('Enter a different account than this Ghost account.');
      return;
    }
    setMoveError(null);
    setMoveConfirmOpen(true);
  };

  const handleConfirmMove = async () => {
    if (moveAccountMutation.isPending) {
      return;
    }
    setMoveConfirmOpen(false);
    try {
      await moveAccountMutation.mutateAsync(normalizeHandle(targetHandle));
    } catch (error) {
      setMoveError(getMoveErrorMessage(error));
    }
  };

  if (hasMigrationLoadError) {
    return (
      <>
        <p role="alert">Could not load migration status. Please try again.</p>
        <Button className="mt-3" onClick={() => refetchMigration()}>
          Retry
        </Button>
      </>
    );
  }

  if (isLoadingMigration || !migration) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-full max-w-[520px]" />
        <Skeleton className="h-5 w-full max-w-[420px]" />
        <Skeleton className="h-9 w-48" />
      </div>
    );
  }

  if (migration.sent) {
    return (
      <p className="text-base" role="status">
        Your followers were asked to follow {destinationHandle ?? 'your new account'}. It may take a
        while for every account to update.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3 text-base text-gray-800 dark:text-gray-600">
        <p>
          1. On your new account, add{' '}
          {isLoadingAccount ? (
            <Skeleton className="inline-block h-5 w-40 align-text-bottom" />
          ) : ownHandle ? (
            <>
              <strong>{ownHandle}</strong>
              <Button
                aria-label="Copy Ghost handle"
                className="ml-1.5 size-6 p-0 align-middle hover:opacity-80"
                title="Copy handle"
                type="button"
                variant="link"
                onClick={() => {
                  void handleCopy();
                }}
              >
                {!copied ? <LucideIcon.Copy size={16} /> : <LucideIcon.Check size={16} />}
              </Button>
            </>
          ) : (
            <strong>your Ghost handle</strong>
          )}{' '}
          as an alias. On Mastodon, open Preferences → Account → Moving from a different account →
          create an account alias (see the{' '}
          <a
            className="underline hover:text-black dark:hover:text-white"
            href="https://docs.joinmastodon.org/user/moving/#account-aliases"
            rel="noopener noreferrer"
            target="_blank"
          >
            Mastodon guide
          </a>
          ).
        </p>
        <p>2. Enter your new account’s handle.</p>
      </div>

      {showDestinationForm ? (
        <form className="mt-6" onSubmit={handleMoveSubmit}>
          {migration.targetApId && (
            <p className="mb-4 text-sm" role="status">
              {destinationHandle
                ? `A move to ${destinationHandle} is still in progress. You can try sending it again.`
                : 'A move is still in progress. Enter the destination handle and try sending it again.'}
            </p>
          )}
          <Field data-invalid={moveError ? true : undefined}>
            <FieldLabel htmlFor="account-migration-target-handle">New account handle</FieldLabel>
            <FieldDescription id="account-migration-target-handle-description">
              Specify the username@domain of the account you want to move to
            </FieldDescription>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                aria-describedby={
                  moveError
                    ? 'account-migration-target-handle-error'
                    : 'account-migration-target-handle-description'
                }
                aria-invalid={moveError ? true : undefined}
                autoComplete="off"
                className="sm:flex-1"
                disabled={moveAccountMutation.isPending}
                id="account-migration-target-handle"
                placeholder="username@domain"
                value={targetHandle}
                onChange={(event) => {
                  setTargetHandle(event.target.value);
                  setMoveError(null);
                }}
              />
              <Button
                className="relative sm:w-auto"
                disabled={moveAccountMutation.isPending}
                type="submit"
              >
                <span className={moveAccountMutation.isPending ? 'invisible' : undefined}>
                  Move followers
                </span>
                {moveAccountMutation.isPending && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <LoadingIndicator color="light" size="sm" />
                    <span className="sr-only">Sending move...</span>
                  </span>
                )}
              </Button>
            </div>
            {moveError && (
              <FieldError id="account-migration-target-handle-error">{moveError}</FieldError>
            )}
          </Field>
        </form>
      ) : (
        <Button className="mt-6" variant="outline" onClick={() => setExportFormReady(true)}>
          I’ve added the alias
          <LucideIcon.ArrowRight />
        </Button>
      )}

      <AlertDialog open={moveConfirmOpen} onOpenChange={setMoveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move followers?</AlertDialogTitle>
            <AlertDialogDescription>
              Your followers will be asked to follow {normalizedDestination} instead. This can’t be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmMove}>
              Move followers
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ExportAccount;
