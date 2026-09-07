import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EmptyIndicator,
  LoadingIndicator,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  ToggleGroup,
  ToggleGroupItem,
} from '@tryghost/shade/components';
import {
  getSettingValue,
  useBrowseSettings,
  useNewslettersEnabled,
  usePaidMembersEnabled,
} from '@tryghost/admin-x-framework/api/settings';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { toast } from 'sonner';
import { useBrowseNewsletters } from '@tryghost/admin-x-framework/api/newsletters';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import { useBrowseTiers } from '@tryghost/admin-x-framework/api/tiers';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import {
  isAdminUser,
  isContributorUser,
  isEditorUser,
  isOwnerUser,
} from '@tryghost/admin-x-framework/api/users';

import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import { BrowserPreview } from './browser-preview';
import { EmailPreview } from './email-preview';
import {
  browserPreviewUrl,
  type PreviewAudience,
  type PreviewDevice,
  type PreviewSegment,
} from './preview-url';

type PreviewFormat = 'browser' | 'email';

type PrepareState = 'preparing' | 'ready' | 'failed';

interface SegmentOption {
  label: string;
  value: PreviewSegment;
}

interface PostPreviewModalProps {
  open: boolean;
  postId: string;
  /** The post's public preview URL (`/p/:uuid/`), empty until the post has a uuid. */
  previewUrl: string;
  /** Pages have no email preview. */
  isPost?: boolean;
  /** The post's own newsletter, preselected in the email preview. */
  newsletterSlug?: string;
  /** Awaited before the preview renders, so the caller can save the draft first. */
  onBeforeOpen?: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
}

export function PostPreviewModal({
  open,
  postId,
  previewUrl,
  isPost = true,
  newsletterSlug,
  onBeforeOpen,
  onOpenChange,
}: PostPreviewModalProps) {
  const [format, setFormat] = useState<PreviewFormat>('browser');
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const [segment, setSegment] = useState<PreviewSegment>('free');
  const [pickedTierSlug, setPickedTierSlug] = useState<string | null>(null);
  const [pickedNewsletterSlug, setPickedNewsletterSlug] = useState<string | null>(null);
  const [prepareState, setPrepareState] = useState<PrepareState>(() =>
    onBeforeOpen && open ? 'preparing' : 'ready',
  );
  const [wasOpen, setWasOpen] = useState(open);

  const handleError = useHandleError();
  const { data: currentUser } = useCurrentUser();
  const { data: settingsData } = useBrowseSettings();
  const paidMembersEnabled = usePaidMembersEnabled();
  const newslettersEnabled = useNewslettersEnabled();
  const membersEnabled =
    getSettingValue<boolean>(settingsData?.settings ?? [], 'members_enabled') === true;
  const emailAvailable =
    isPost &&
    membersEnabled &&
    Boolean(newslettersEnabled) &&
    !!currentUser &&
    !isContributorUser(currentUser);
  const testEmailAvailable =
    !!currentUser &&
    (isOwnerUser(currentUser) || isAdminUser(currentUser) || isEditorUser(currentUser));

  const { data: tiersData } = useBrowseTiers({
    searchParams: { filter: 'type:paid', limit: 'all' },
    enabled: open && prepareState === 'ready' && paidMembersEnabled === true,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const tiers = useMemo(() => tiersData?.tiers ?? [], [tiersData]);

  const {
    data: newslettersData,
    isError: activeNewslettersError,
    isFetching: activeNewslettersFetching,
    refetch: refetchActiveNewsletters,
  } = useBrowseNewsletters({
    searchParams: { filter: 'status:active', limit: 'all' },
    enabled: open && prepareState === 'ready' && emailAvailable,
    requestOptions: EDITOR_REQUEST_OPTIONS,
    staleTime: 0,
  });
  const activeNewsletters = useMemo(() => newslettersData?.newsletters ?? [], [newslettersData]);

  // The post's newsletter is what its email renders as, so it stays selectable
  // even once it has left the active list.
  const postNewsletterMissing =
    Boolean(newslettersData) &&
    !activeNewslettersError &&
    !activeNewslettersFetching &&
    Boolean(newsletterSlug) &&
    !activeNewsletters.some((newsletter) => newsletter.slug === newsletterSlug);
  const {
    data: postNewsletterData,
    isError: postNewsletterError,
    isFetching: postNewsletterFetching,
    refetch: refetchPostNewsletter,
  } = useBrowseNewsletters({
    searchParams: { filter: `slug:${newsletterSlug ?? ''}`, limit: '1' },
    enabled: open && prepareState === 'ready' && emailAvailable && postNewsletterMissing,
    requestOptions: EDITOR_REQUEST_OPTIONS,
    staleTime: 0,
  });
  const postNewsletter =
    postNewsletterMissing && postNewsletterData
      ? postNewsletterData.newsletters.find((newsletter) => newsletter.slug === newsletterSlug)
      : undefined;
  const postNewsletterDeleted =
    postNewsletterMissing && !postNewsletterError && Boolean(postNewsletterData) && !postNewsletter;
  const newsletterLookupError =
    activeNewslettersError || (postNewsletterMissing && postNewsletterError);
  const newsletterLookupPending =
    (emailAvailable &&
      (activeNewslettersFetching || (!newslettersData && !activeNewslettersError))) ||
    (postNewsletterMissing &&
      (postNewsletterFetching || (!postNewsletterData && !postNewsletterError)));
  const newsletters = useMemo(
    () => (postNewsletter ? [postNewsletter, ...activeNewsletters] : activeNewsletters),
    [activeNewsletters, postNewsletter],
  );

  const beforeOpen = useRef(onBeforeOpen);
  const preparePromise = useRef<Promise<void> | null>(null);
  beforeOpen.current = onBeforeOpen;

  // Opening must not render a preview of the unsaved post, so the state moves
  // during render rather than in an effect that runs after that first commit.
  if (open !== wasOpen) {
    setWasOpen(open);
    preparePromise.current = null;
    setPrepareState(open && onBeforeOpen ? 'preparing' : 'ready');
  }

  useEffect(() => {
    if (!open || prepareState !== 'preparing') {
      return;
    }

    const prepare = beforeOpen.current;
    if (!prepare) {
      setPrepareState('ready');
      return;
    }

    const promise =
      preparePromise.current ?? (preparePromise.current = Promise.resolve().then(prepare));
    let cancelled = false;
    void promise.then(
      () => {
        if (!cancelled) {
          setPrepareState('ready');
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          handleError(error);
          setPrepareState('failed');
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [handleError, open, prepareState]);

  const segmentOptions = useMemo<SegmentOption[]>(() => {
    const options: SegmentOption[] =
      format === 'email'
        ? [{ label: 'Free member', value: 'free' }]
        : [
            { label: 'Public visitor', value: 'anonymous' },
            { label: 'Free member', value: 'free' },
          ];

    if (paidMembersEnabled) {
      options.push({ label: 'Paid member', value: 'paid' });

      if (tiers.length > 0) {
        options.push({ label: 'Specific tier', value: 'tier' });
      }
    }

    return options;
  }, [format, paidMembersEnabled, tiers.length]);

  const defaultTier = tiers.find((tier) => tier.active) ?? tiers[0];
  const tierSlug = pickedTierSlug ?? defaultTier?.slug;
  const selectedTier = tiers.find((tier) => tier.slug === tierSlug);
  const activeTiers = tiers.filter((tier) => tier.active);
  const archivedTiers = tiers.filter((tier) => !tier.active);

  // The post's own newsletter wins even when it is no longer on the active
  // list, because that is the newsletter its email would be rendered for.
  const selectedNewsletterSlug = pickedNewsletterSlug ?? newsletterSlug ?? newsletters[0]?.slug;

  const retryNewsletterLookup = () => {
    if (activeNewslettersError) {
      void refetchActiveNewsletters();
    }
    if (postNewsletterError) {
      void refetchPostNewsletter();
    }
  };

  const audience: PreviewAudience = { segment, tierSlug };
  const audienceUrl = browserPreviewUrl(previewUrl, audience);
  const previewActionsAvailable = prepareState === 'ready' && Boolean(audienceUrl);
  const showSegmentSelect = format === 'browser' || segmentOptions.length > 1;
  const showTierSelect = segment === 'tier' && tiers.length > 0;
  const showEmail = format === 'email' && emailAvailable;

  const changeFormat = (next: PreviewFormat) => {
    setFormat(next);

    if (next === 'email' && segment === 'anonymous') {
      setSegment('free');
    }
  };

  const copyPreviewLink = async () => {
    try {
      await navigator.clipboard.writeText(audienceUrl);
      toast.success('Preview link copied');
    } catch {
      toast.error('Could not copy the preview link');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="top-0 left-0 grid h-dvh w-dvw max-w-none translate-x-0 grid-rows-[auto_1fr] gap-0 rounded-none p-0"
        data-testid="post-preview-modal"
      >
        <DialogHeader className="flex-row items-center justify-between gap-4 border-b border-border-default p-4">
          <DialogTitle className="text-lg">Preview</DialogTitle>
          <Inline gap="md">
            {emailAvailable && (
              <Tabs
                value={format}
                variant="segmented"
                onValueChange={(value) => changeFormat(value as PreviewFormat)}
              >
                <TabsList>
                  <TabsTrigger value="browser">Web</TabsTrigger>
                  <TabsTrigger value="email">Email</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <ToggleGroup
              type="single"
              value={device}
              onValueChange={(value) => {
                if (value === 'desktop' || value === 'mobile') {
                  setDevice(value);
                }
              }}
            >
              <ToggleGroupItem aria-label="Desktop" value="desktop">
                <LucideIcon.Laptop />
              </ToggleGroupItem>
              <ToggleGroupItem aria-label="Mobile" value="mobile">
                <LucideIcon.Smartphone />
              </ToggleGroupItem>
            </ToggleGroup>
            {showSegmentSelect && (
              <Select
                value={segment}
                onValueChange={(value) => setSegment(value as PreviewSegment)}
              >
                <SelectTrigger aria-label="Preview as" className="w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {segmentOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {showTierSelect && (
              <Select value={tierSlug} onValueChange={setPickedTierSlug}>
                <SelectTrigger aria-label="Tier" className="w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeTiers.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Active tiers</SelectLabel>
                      {activeTiers.map((tier) => (
                        <SelectItem key={tier.id} value={tier.slug}>
                          {tier.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {archivedTiers.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Archived tiers</SelectLabel>
                      {archivedTiers.map((tier) => (
                        <SelectItem key={tier.id} value={tier.slug}>
                          {tier.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            )}
          </Inline>
          <Inline gap="sm">
            <Button
              aria-label="Copy preview link"
              disabled={!previewActionsAvailable}
              variant="outline"
              onClick={() => void copyPreviewLink()}
            >
              <LucideIcon.Link />
            </Button>
            {previewActionsAvailable ? (
              <Button variant="outline" asChild>
                <a href={audienceUrl} rel="noopener noreferrer" target="_blank">
                  <LucideIcon.ExternalLink />
                  Open in new tab
                </a>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                <LucideIcon.ExternalLink />
                Open in new tab
              </Button>
            )}
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </Inline>
        </DialogHeader>
        <Inline className="min-h-0 overflow-auto bg-surface-panel p-6" gap="none" justify="center">
          {prepareState === 'preparing' ? (
            <Inline align="center" className="grow" gap="none" justify="center">
              <LoadingIndicator size="lg" />
            </Inline>
          ) : prepareState === 'failed' ? (
            <EmptyIndicator
              actions={
                <Button
                  variant="outline"
                  onClick={() => {
                    preparePromise.current = null;
                    setPrepareState('preparing');
                  }}
                >
                  Retry
                </Button>
              }
              className="grow justify-center"
              data-testid="post-preview-save-failed"
              description="Saving the post failed, so there is nothing new to preview."
              title="Couldn’t preview this post"
            >
              <LucideIcon.TriangleAlert />
            </EmptyIndicator>
          ) : showEmail ? (
            <EmailPreview
              audience={audience}
              canSendTestEmail={testEmailAvailable}
              device={device}
              newsletterLookupError={newsletterLookupError}
              newsletterLookupPending={newsletterLookupPending}
              newsletterMissing={postNewsletterDeleted && selectedNewsletterSlug === newsletterSlug}
              newsletters={newsletters}
              newsletterSlug={selectedNewsletterSlug}
              postId={postId}
              tierName={selectedTier?.name}
              onNewsletterChange={setPickedNewsletterSlug}
              onRetryNewsletterLookup={retryNewsletterLookup}
            />
          ) : (
            <BrowserPreview audience={audience} device={device} previewUrl={previewUrl} />
          )}
        </Inline>
      </DialogContent>
    </Dialog>
  );
}
