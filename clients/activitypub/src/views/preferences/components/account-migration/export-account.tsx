import React, { useState } from 'react';
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
import { HANDLE_REGEX, getMoveErrorMessage, handlesEqual, normalizeHandle } from './utils';
import { LucideIcon } from '@tryghost/shade/utils';
import { toast } from 'sonner';
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
  const destinationHandle = migration?.targetHandle ?? null;
  // The service only accepts a retry to the destination the move started with
  const lockedDestination = migration?.targetApId ? destinationHandle : null;
  const destination = lockedDestination ?? targetHandle;
  const normalizedDestination = normalizeHandle(destination);
  const showDestinationForm = exportFormReady || Boolean(migration?.targetApId);

  const handleCopy = async () => {
    if (!ownHandle) {
      return;
    }

    try {
      await navigator.clipboard.writeText(ownHandle);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy handle');
    }
  };

  const handleMoveSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (moveAccountMutation.isPending) {
      return;
    }
    if (!HANDLE_REGEX.test(destination.trim())) {
      setMoveError('Enter a valid destination handle, like new@mastodon.social.');
      return;
    }
    if (ownHandle && handlesEqual(destination, ownHandle)) {
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
      await moveAccountMutation.mutateAsync(normalizedDestination);
    } catch (error) {
      setMoveError(getMoveErrorMessage(error));
    }
  };

  // A failed refetch keeps the last status, which is still worth showing
  if (hasMigrationLoadError && !migration) {
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
        Your followers were directed to follow {destinationHandle ?? 'your new account'}. It will
        take a while for each account to update.
      </p>
    );
  }

  return (
    <>
      <p className="text-base text-gray-800 dark:text-gray-600">
        Add{' '}
        {isLoadingAccount ? (
          <Skeleton className="inline-block h-5 w-40 align-text-bottom" />
        ) : ownHandle ? (
          <>
            <strong>{ownHandle}</strong>
            <Button
              aria-label="Copy handle"
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
        as an alias on your new social web profile first. Then enter that profile’s handle here.
        Compatible servers will receive a request to move your followers. Keep this Ghost account
        available while they process it.
      </p>

      {showDestinationForm ? (
        <form className="mt-6" onSubmit={handleMoveSubmit}>
          {migration.targetApId && (
            <p className="mb-4 text-sm" role="status">
              {destinationHandle
                ? `A move to ${destinationHandle} is in progress.`
                : 'A move is in progress. Enter the destination handle and try sending it again.'}
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
                readOnly={Boolean(lockedDestination)}
                value={destination}
                onChange={(event) => {
                  setTargetHandle(event.target.value);
                  setMoveError(null);
                }}
              />
              <Button className="sm:w-auto" disabled={moveAccountMutation.isPending} type="submit">
                {moveAccountMutation.isPending ? (
                  <>
                    <LoadingIndicator size="sm" />
                    <span className="sr-only">Moving...</span>
                  </>
                ) : (
                  'Move followers'
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
              Your followers will be directed to {normalizedDestination} instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMove}>Move followers</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ExportAccount;
