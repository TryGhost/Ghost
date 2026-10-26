import APAvatar from '@src/components/global/ap-avatar';
import EditProfile from '@src/views/preferences/components/edit-profile';
import Layout from '@src/components/layout';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Banner,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  LoadingIndicator,
} from '@tryghost/shade/components';
import { type BlueskyDomainHandle, supportsBlueskyDomainHandles } from '@src/api/activitypub';
import { H2, H3 } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { toast } from 'sonner';
import {
  useAccountForUser,
  useClaimBlueskyDomainHandleMutationForUser,
  useConfirmBlueskyHandleMutationForUser,
  useDisableBlueskyMutationForUser,
  useEnableBlueskyMutationForUser,
} from '@hooks/use-activity-pub-queries';

const CONFIRMATION_INTERVAL = 5000;
const MAX_CONFIRMATION_RETRIES = 12;
// Bridgy Fed usually switches the handle within a minute
const MAX_DOMAIN_HANDLE_CHECKS = 24;
const DOMAIN_HANDLE_HELP_URL = 'https://ghost.org/help/social-web/';

const LearnMore: React.FC = () => (
  <a
    className="text-purple hover:text-purple-600"
    href={DOMAIN_HANDLE_HELP_URL}
    rel="noreferrer"
    target="_blank"
  >
    Learn more
  </a>
);

const BetterHandleCallout: React.FC<{
  children: React.ReactNode;
  action: React.ReactNode;
}> = ({ children, action }) => (
  <Banner className="w-full" size="md" variant="info">
    <div className="flex items-center gap-3 text-left">
      <LucideIcon.Sparkles className="shrink-0 text-purple" size={18} />
      <div className="grow text-sm">
        <p className="font-medium">A better handle is available</p>
        <p className="text-text-secondary">{children}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  </Banner>
);

/**
 * Offers the site's domain as the Bluesky handle where the publisher can do
 * something about it. Automatic setup, and failures the publisher can't fix
 * (eg a proxy that doesn't route /.well-known/atproto-did), show nothing
 */
const DomainHandleCallout: React.FC<{
  domainHandle: BlueskyDomainHandle | null;
  domain: string;
  busy: boolean;
  stoppedChecking: boolean;
  onUseDomain: () => void;
  onCheckAgain: () => void;
}> = ({ domainHandle, domain, busy, stoppedChecking, onUseDomain, onCheckAgain }) => {
  const handle = `@${domainHandle?.domain ?? domain}`;
  const switching = (
    <span className="flex items-center gap-2 text-sm text-text-secondary">
      <LoadingIndicator size="sm" />
      Switching...
    </span>
  );

  if (domainHandle?.status === 'claiming' && !domainHandle.automatic) {
    return stoppedChecking ? (
      <BetterHandleCallout
        action={
          <Button size="sm" variant="outline" onClick={onCheckAgain}>
            Check again
          </Button>
        }
      >
        Switching to {handle} can take a few minutes.
      </BetterHandleCallout>
    ) : (
      <BetterHandleCallout action={switching}>
        Use your site&apos;s domain, {handle}, as your Bluesky handle.
      </BetterHandleCallout>
    );
  }

  if (domainHandle?.status === 'unavailable' && domainHandle.reason === 'taken') {
    return (
      <BetterHandleCallout
        action={
          busy ? (
            switching
          ) : (
            <Button size="sm" variant="outline" onClick={onUseDomain}>
              Try again
            </Button>
          )
        }
      >
        {handle} is used by another Bluesky account. Remove it there, then try again. <LearnMore />
      </BetterHandleCallout>
    );
  }

  // Not tried yet: sharing was enabled before domain handles existed, or the
  // site moved to another domain since
  if (domainHandle === null || domainHandle.status === 'released') {
    return (
      <BetterHandleCallout
        action={
          busy ? (
            switching
          ) : (
            <Button size="sm" onClick={onUseDomain}>
              Use domain handle
            </Button>
          )
        }
      >
        Use your site&apos;s domain, {handle}, as your Bluesky handle.
      </BetterHandleCallout>
    );
  }

  return null;
};

const BlueskySharing: React.FC = () => {
  const { data: account, isLoading: isLoadingAccount } = useAccountForUser('index', 'me');
  const [loading, setLoading] = useState(
    () => account?.blueskyEnabled && !account?.blueskyHandleConfirmed,
  );
  const [copied, setCopied] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [handleConfirmed, setHandleConfirmed] = useState(false);
  const [stoppedCheckingDomainHandle, setStoppedCheckingDomainHandle] = useState(false);
  const [domainHandleCheckRound, setDomainHandleCheckRound] = useState(0);
  const retryCountRef = useRef(0);
  const isConfirmingRef = useRef(false);
  const wasSettingUpRef = useRef(false);
  const enableBlueskyMutation = useEnableBlueskyMutationForUser('index');
  const disableBlueskyMutation = useDisableBlueskyMutationForUser('index');
  const confirmBlueskyHandleMutation = useConfirmBlueskyHandleMutationForUser('index');
  const claimBlueskyDomainHandleMutation = useClaimBlueskyDomainHandleMutationForUser('index');
  // Older ActivityPub services keep Bridgy Fed's default handle
  const domainHandlesSupported = supportsBlueskyDomainHandles(account);
  const domainHandle = account?.blueskyDomainHandle ?? null;
  const domainHandleStatus = domainHandle?.status ?? null;
  const siteDomain = account?.handle?.split('@').pop() || 'your domain';
  // Enabling sets up the domain handle too, which is shown as one step
  const isSettingUp =
    !!account?.blueskyEnabled &&
    (!account?.blueskyHandleConfirmed ||
      (domainHandleStatus === 'claiming' &&
        !!domainHandle?.automatic &&
        !stoppedCheckingDomainHandle));

  const handleCopy = async () => {
    setCopied(true);
    await navigator.clipboard.writeText(account?.blueskyHandle || '');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnable = async () => {
    if (!account?.avatarUrl) {
      setIsEditingProfile(true);
    } else {
      setLoading(true);
      try {
        await enableBlueskyMutation.mutateAsync();
      } catch {
        setLoading(false);
        toast.error('Something went wrong, please try again.');
      }
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      await disableBlueskyMutation.mutateAsync();
      setShowConfirm(false);
      toast.success('Bluesky sharing disabled');
    } finally {
      setLoading(false);
    }
  };

  const confirmHandle = useCallback(() => {
    // One check at a time, so a slow, older response can't overwrite a newer one
    if (isConfirmingRef.current) {
      return;
    }

    isConfirmingRef.current = true;

    confirmBlueskyHandleMutation
      .mutateAsync()
      .then(({ handle }) => {
        if (handle) {
          setHandleConfirmed(true);
        }
      })
      .catch(() => {
        // Errors are handled by the mutation, the next check retries
      })
      .finally(() => {
        isConfirmingRef.current = false;
      });
  }, []); // Empty deps - mutations are stable in practice

  const handleClaimDomainHandle = async () => {
    try {
      await claimBlueskyDomainHandleMutation.mutateAsync();
    } catch {
      toast.error('Something went wrong, please try again.');
    }
  };

  useEffect(() => {
    if (!account?.blueskyEnabled) {
      setHandleConfirmed(false);
      setLoading(false);
      retryCountRef.current = 0;

      return;
    }

    if (account?.blueskyHandleConfirmed) {
      setHandleConfirmed(true);
      setLoading(false);
      retryCountRef.current = 0;

      return;
    }

    setHandleConfirmed(false);
    setLoading(true);
    retryCountRef.current = 0;

    const confirmHandleInterval = setInterval(async () => {
      retryCountRef.current += 1;

      if (retryCountRef.current > MAX_CONFIRMATION_RETRIES) {
        clearInterval(confirmHandleInterval);

        toast.error('Something went wrong, please try again.');

        await disableBlueskyMutation.mutateAsync();
        setLoading(false);

        return;
      }

      confirmHandle();
    }, CONFIRMATION_INTERVAL);

    return () => clearInterval(confirmHandleInterval);
  }, [account?.blueskyEnabled, account?.blueskyHandleConfirmed, confirmHandle]); // disableBlueskyMutation is stable

  // Tell the publisher once enabling has finished, including the domain handle
  useEffect(() => {
    if (wasSettingUpRef.current && !isSettingUp && account?.blueskyEnabled) {
      toast.success('Bluesky sharing enabled');
    }

    wasSettingUpRef.current = isSettingUp;
  }, [isSettingUp, account?.blueskyEnabled]);

  // Keep checking while the domain is being switched to
  const shouldCheckDomainHandle =
    domainHandlesSupported &&
    !!account?.blueskyEnabled &&
    !!account?.blueskyHandleConfirmed &&
    domainHandleStatus === 'claiming';

  useEffect(() => {
    if (!shouldCheckDomainHandle) {
      return;
    }

    confirmHandle();

    let checks = 0;

    const domainHandleInterval = setInterval(() => {
      checks += 1;

      if (checks > MAX_DOMAIN_HANDLE_CHECKS) {
        clearInterval(domainHandleInterval);
        // Bluesky can be slow: stop saying it's switching. Enabling counts
        // as done, and a switch the publisher asked for offers to check again
        setStoppedCheckingDomainHandle(true);

        return;
      }

      confirmHandle();
    }, CONFIRMATION_INTERVAL);

    return () => clearInterval(domainHandleInterval);
  }, [shouldCheckDomainHandle, domainHandleStatus, domainHandleCheckRound, confirmHandle]);

  // A new status (eg a new claim) starts the checks from scratch
  useEffect(() => {
    setStoppedCheckingDomainHandle(false);
  }, [domainHandleStatus]);

  const handleCheckDomainHandleAgain = () => {
    setStoppedCheckingDomainHandle(false);
    setDomainHandleCheckRound((round) => round + 1);
  };

  if (isLoadingAccount) {
    return (
      <Layout>
        <div className="mx-auto max-w-[620px] py-[min(4vh,48px)]">
          <div className="flex items-center justify-between gap-8">
            <H2>Bluesky sharing</H2>
          </div>
          <div className="mt-6 flex justify-center">
            <LoadingIndicator size="md" />
          </div>
        </div>
      </Layout>
    );
  }

  const showAsEnabled = account?.blueskyEnabled && account?.blueskyHandleConfirmed && !isSettingUp;
  const showsDomain = account?.blueskyHandle?.replace(/^@/, '') === siteDomain;

  return (
    <Layout>
      <div className="mx-auto max-w-[620px] py-[min(4vh,48px)]">
        <div className="flex items-center justify-between gap-8">
          <H2>Bluesky sharing</H2>
          {showAsEnabled && (
            <Button
              className="group w-24 translate-y-1 px-2 hover:bg-red/5! hover:text-red"
              size="default"
              variant="outline"
              onClick={() => setShowConfirm(true)}
            >
              <span className="size-2 rounded-full bg-green group-hover:hidden"></span>
              <span className="group-hover:hidden">Enabled</span>
              <span className="hidden group-hover:visible! group-hover:inline!">Disable</span>
            </Button>
          )}
        </div>
        {!showAsEnabled ? (
          <div className="mt-3 flex flex-col gap-5">
            <p className="text-base">
              {!account?.avatarUrl ? (
                'Add a profile image to connect to Bluesky. Profile pictures help prevent spam.'
              ) : (
                <>
                  Connect your account to{' '}
                  <a
                    className="text-purple hover:text-purple-600"
                    href="https://fed.brid.gy"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Bridgy Fed
                  </a>{' '}
                  to share content directly to a dedicated Bluesky profile and increase your reach
                  across the social web.
                </>
              )}
            </p>
            {!domainHandlesSupported && (
              <p className="-mt-2 text-base">
                You can&apos;t change your Bluesky username, so make sure you&apos;re happy with
                your current social web handle before connecting.
              </p>
            )}
            {!account?.avatarUrl ? (
              <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                <DialogTrigger>
                  <Button className="h-10 w-full text-base" variant="secondary">
                    Edit profile
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className="w-full max-w-[520px]"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <DialogHeader>
                    <DialogTitle>Profile settings</DialogTitle>
                  </DialogHeader>
                  {account && (
                    <EditProfile account={account} setIsEditingProfile={setIsEditingProfile} />
                  )}
                </DialogContent>
              </Dialog>
            ) : (
              <>
                <Button
                  className="h-10 text-base"
                  disabled={loading || isSettingUp}
                  variant="secondary"
                  onClick={handleEnable}
                >
                  {!(loading || isSettingUp) ? (
                    <>
                      <svg
                        height="32"
                        role="img"
                        viewBox="0 0 24 24"
                        width="32"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 10.8c-1.087 -2.114 -4.046 -6.053 -6.798 -7.995C2.566 0.944 1.561 1.266 0.902 1.565 0.139 1.908 0 3.08 0 3.768c0 0.69 0.378 5.65 0.624 6.479 0.815 2.736 3.713 3.66 6.383 3.364 0.136 -0.02 0.275 -0.039 0.415 -0.056 -0.138 0.022 -0.276 0.04 -0.415 0.056 -3.912 0.58 -7.387 2.005 -2.83 7.078 5.013 5.19 6.87 -1.113 7.823 -4.308 0.953 3.195 2.05 9.271 7.733 4.308 4.267 -4.308 1.172 -6.498 -2.74 -7.078a8.741 8.741 0 0 1 -0.415 -0.056c0.14 0.017 0.279 0.036 0.415 0.056 2.67 0.297 5.568 -0.628 6.383 -3.364 0.246 -0.828 0.624 -5.79 0.624 -6.478 0 -0.69 -0.139 -1.861 -0.902 -2.206 -0.659 -0.298 -1.664 -0.62 -4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"
                          fill="#0385FF"
                          strokeWidth="1"
                        ></path>
                      </svg>
                      Enable Bluesky sharing
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <LoadingIndicator size="sm" />
                      <span>Enabling Bluesky sharing...</span>
                    </div>
                  )}
                </Button>
                {(loading || isSettingUp) && (
                  <p className="-mt-2 text-center text-sm text-gray-700 dark:text-gray-600">
                    You can leave this page and come back to check the status.
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            <p className="mt-2 pr-32 text-base">
              Your social web profile is now connected to Bluesky, via{' '}
              <a
                className="text-purple hover:text-purple-600"
                href="https://fed.brid.gy"
                rel="noreferrer"
                target="_blank"
              >
                Bridgy Fed
              </a>
              . Posts are automatically synced after a short delay to complete activation.
            </p>
            {handleConfirmed && (
              <div className="mt-6 flex flex-col items-center gap-4 rounded-lg border border-gray-200 p-8 dark:border-gray-950">
                <div className="relative">
                  <APAvatar
                    author={{
                      icon: {
                        url: account?.avatarUrl || '',
                      },
                      name: account?.name || '',
                      handle: account?.handle || '',
                    }}
                    size="md"
                  />
                  <div className="absolute right-0 bottom-0 z-10 flex size-6 items-center justify-center rounded-full bg-white shadow-xs">
                    <svg
                      height="14"
                      role="img"
                      viewBox="0 0 24 24"
                      width="14"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 10.8c-1.087 -2.114 -4.046 -6.053 -6.798 -7.995C2.566 0.944 1.561 1.266 0.902 1.565 0.139 1.908 0 3.08 0 3.768c0 0.69 0.378 5.65 0.624 6.479 0.815 2.736 3.713 3.66 6.383 3.364 0.136 -0.02 0.275 -0.039 0.415 -0.056 -0.138 0.022 -0.276 0.04 -0.415 0.056 -3.912 0.58 -7.387 2.005 -2.83 7.078 5.013 5.19 6.87 -1.113 7.823 -4.308 0.953 3.195 2.05 9.271 7.733 4.308 4.267 -4.308 1.172 -6.498 -2.74 -7.078a8.741 8.741 0 0 1 -0.415 -0.056c0.14 0.017 0.279 0.036 0.415 0.056 2.67 0.297 5.568 -0.628 6.383 -3.364 0.246 -0.828 0.624 -5.79 0.624 -6.478 0 -0.69 -0.139 -1.861 -0.902 -2.206 -0.659 -0.298 -1.664 -0.62 -4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"
                        fill="#0385FF"
                        strokeWidth="1"
                      ></path>
                    </svg>
                  </div>
                </div>
                <div className="flex grow flex-col items-center">
                  <H3>{account?.name || ''}</H3>
                  <div className="flex items-center gap-1 text-gray-800">
                    <span className="text-lg font-medium">{account?.blueskyHandle}</span>
                    <Button
                      className="size-6 p-0 hover:opacity-80"
                      title="Copy handle"
                      variant="link"
                      onClick={handleCopy}
                    >
                      {!copied ? <LucideIcon.Copy size={16} /> : <LucideIcon.Check size={16} />}
                    </Button>
                  </div>
                </div>
                <Button className="mt-2 w-full" size="lg" variant="secondary" asChild>
                  <a
                    href={`https://bsky.app/profile/${account?.blueskyHandle?.replace(/^@/, '')}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open profile
                    <LucideIcon.ExternalLink size={14} strokeWidth={1.25} />
                  </a>
                </Button>
                {domainHandlesSupported && !showsDomain && (
                  <DomainHandleCallout
                    busy={claimBlueskyDomainHandleMutation.isPending}
                    domain={siteDomain}
                    domainHandle={domainHandle}
                    stoppedChecking={stoppedCheckingDomainHandle}
                    onCheckAgain={handleCheckDomainHandleAgain}
                    onUseDomain={handleClaimDomainHandle}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Bluesky sharing?</AlertDialogTitle>
            <AlertDialogDescription>
              Your bridged Bluesky account will be deactivated and your content will no longer be
              shared on Bluesky. You can re-enable sharing at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                handleDisable();
              }}
            >
              {loading ? <LoadingIndicator color="light" size="sm" /> : 'Disable'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default BlueskySharing;
