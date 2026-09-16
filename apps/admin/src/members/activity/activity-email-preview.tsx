import { useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  EmptyIndicator,
  LoadingIndicator,
  PreviewChrome,
  ToggleGroup,
  ToggleGroupItem,
} from '@tryghost/shade/components';
import { Grid, Inline, Stack } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useEmailPreview } from '@tryghost/admin-x-framework/api/email-previews';
import { useBrowseNewsletters } from '@tryghost/admin-x-framework/api/newsletters';
import { getSettingValues, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import {
  activityEmailPreviewData,
  activityPreviewDocument,
  activitySenderAddress,
} from './activity-email-preview-data';

interface ActivityEmailPreviewProps {
  /** The event's email object, a nested email, or a post with its identity. */
  email: unknown;
  onClose: () => void;
}

export default function ActivityEmailPreview({ email, onClose }: ActivityEmailPreviewProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [opener] = useState(() => window.document.activeElement);
  const source = activityEmailPreviewData(email);
  const fallbackEnabled = !source.stored && !!source.postId;
  const previewQuery = useEmailPreview(source.postId ?? '', { enabled: fallbackEnabled });
  const newslettersQuery = useBrowseNewsletters({
    enabled: !source.newsletter,
    searchParams: { filter: 'status:active', limit: '1' },
  });
  const settingsQuery = useBrowseSettings();
  const configQuery = useBrowseConfig();
  const [siteTitle, defaultEmailAddress] = getSettingValues<string>(
    settingsQuery.data?.settings ?? [],
    ['title', 'default_email_address'],
  );
  const newsletter = source.newsletter ?? newslettersQuery.data?.newsletters[0];
  const senderName = newsletter?.sender_name || siteTitle;
  const senderAddress = activitySenderAddress(
    newsletter?.sender_email ?? undefined,
    defaultEmailAddress,
    configQuery.data?.config,
  );
  const preview =
    source.stored ??
    (fallbackEnabled && !previewQuery.isError ? previewQuery.data?.email_previews[0] : undefined);
  const document = useMemo(
    () => (preview ? activityPreviewDocument(preview.html) : undefined),
    [preview?.html],
  );
  const metadataError =
    settingsQuery.isError ||
    configQuery.isError ||
    (!source.newsletter && newslettersQuery.isError);
  const metadataLoading =
    settingsQuery.isLoading ||
    configQuery.isLoading ||
    (!source.newsletter && newslettersQuery.isLoading);
  const loading = fallbackEnabled && previewQuery.isLoading;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className="top-0 left-0 h-dvh w-full max-w-none translate-0 grid-rows-[auto_1fr] gap-0 rounded-none border-0 p-0 shadow-none sm:rounded-none"
        data-testid="activity-email-preview"
        onCloseAutoFocus={(event) => {
          if (opener instanceof HTMLElement && opener.isConnected) {
            event.preventDefault();
            opener.focus();
          }
        }}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <Grid align="center" className="border-b border-border-default p-4" columns={3} gap="md">
          <DialogTitle>Email preview</DialogTitle>
          <ToggleGroup
            className="justify-self-center"
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
          <Button className="justify-self-end" onClick={onClose}>
            Close
          </Button>
        </Grid>
        <Inline
          align="start"
          className="min-h-0 overflow-auto bg-muted p-3 sm:p-6"
          gap="none"
          justify="center"
        >
          <PreviewChrome
            className={cn(
              'max-w-full shrink-0',
              device === 'desktop'
                ? 'max-w-[740px] px-0 [&>div]:rounded-2xl [&>div]:shadow-2xl'
                : 'shadow-2xl',
            )}
            data-device={device}
            device={device}
          >
            <Stack className="size-full bg-background" gap="none">
              <Stack className="border-b border-border-default p-4 text-[13px]" gap="xs">
                <p className="font-semibold break-words">{preview?.subject}</p>
                <p>
                  <span className="text-muted-foreground">From: </span>
                  {metadataLoading ? (
                    'Loading sender…'
                  ) : metadataError ? (
                    'Sender unavailable'
                  ) : (
                    <>
                      {senderName}
                      {senderAddress && ` <${senderAddress}>`}
                    </>
                  )}
                </p>
                <p>
                  <span className="text-muted-foreground">To: </span>Jamie Larson
                  &lt;jamie@example.com&gt;
                </p>
                {metadataError && (
                  <Inline gap="sm">
                    <p role="alert">Couldn’t load sender details.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void settingsQuery.refetch();
                        void configQuery.refetch();
                        if (!source.newsletter) {
                          void newslettersQuery.refetch();
                        }
                      }}
                    >
                      Retry sender details
                    </Button>
                  </Inline>
                )}
              </Stack>
              {loading ? (
                <Inline
                  aria-label="Loading email preview"
                  className="grow"
                  gap="none"
                  justify="center"
                  role="status"
                >
                  <LoadingIndicator size="md" />
                </Inline>
              ) : preview ? (
                <iframe
                  className="min-h-0 grow border-0"
                  sandbox=""
                  srcDoc={document}
                  title="Email content"
                />
              ) : (
                <EmptyIndicator
                  actions={
                    fallbackEnabled ? (
                      <Button variant="outline" onClick={() => void previewQuery.refetch()}>
                        Retry
                      </Button>
                    ) : undefined
                  }
                  className="grow justify-center"
                  description={
                    fallbackEnabled
                      ? 'The email preview could not be loaded.'
                      : 'The original email content is no longer available.'
                  }
                  role="alert"
                  title="Couldn’t load the email preview"
                >
                  <LucideIcon.MailWarning />
                </EmptyIndicator>
              )}
            </Stack>
          </PreviewChrome>
        </Inline>
      </DialogContent>
    </Dialog>
  );
}
