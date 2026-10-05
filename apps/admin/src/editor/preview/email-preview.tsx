import {
  Button,
  EmptyIndicator,
  LoadingIndicator,
  PreviewChrome,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { Box, Grid, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import {
  type Config,
  hasSendingDomain,
  isManagedEmail,
  useBrowseConfig,
} from '@tryghost/admin-x-framework/api/config';
import { getSettingValues } from '@tryghost/admin-x-framework/api/settings';
import { useEmailPreview } from '@tryghost/admin-x-framework/api/email-previews';
import type { Newsletter } from '@tryghost/admin-x-framework/api/newsletters';
import {
  postPreviewEmail,
  postPreviewEmailFrame,
  postPreviewEmailFrom,
  postPreviewEmailSizeWarning,
  postPreviewEmailSubject,
  postPreviewNewsletterMissing,
  postPreviewNewslettersError,
} from '@tryghost/test-data/selectors/editor';

import type { PublishFlowPost } from '@/editor/publish/flow-post';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import { useEmailSize } from '@/editor/use-email-size';
import { useEditorSettings } from '@/editor/use-editor-settings';
import { SendTestEmail } from './send-test-email';
import { EmailSubject, type EmailSubjectEditor } from './email-subject';
import {
  audienceDescription,
  emailPreviewAudience,
  type PreviewAudience,
  type PreviewDevice,
} from './preview-url';

// Scrollbar chrome for the rendered email document, which carries its own
// styles and never sees the admin stylesheet.
const PREVIEW_DOCUMENT_STYLES = `
html {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}
html::-webkit-scrollbar {
    width: 8px;
    background: transparent;
}
html::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background-color: rgba(0, 0, 0, 0.2);
}
html::-webkit-scrollbar-thumb:hover {
    background-color: rgba(0, 0, 0, 0.3);
}
`;

function withPreviewDocumentStyles(html: string): string {
  const styles = `<style>${PREVIEW_DOCUMENT_STYLES}</style>`;

  return html.includes('</head>')
    ? html.replace('</head>', `${styles}</head>`)
    : `${html}${styles}`;
}

// Managed email sends from the default address unless the sender is on the sending domain.
function senderEmailAddress(sender: string | null, defaultAddress: string, config: Config): string {
  if (!isManagedEmail(config)) {
    return sender || defaultAddress;
  }

  if (!hasSendingDomain(config)) {
    return defaultAddress;
  }

  const sendingDomain = config.hostSettings?.managedEmail?.sendingDomain;

  return sender && sender.split('@')[1] === sendingDomain ? sender : defaultAddress;
}

function EmailSizeBanner({ post }: { post: PublishFlowPost }) {
  const emailSize = useEmailSize(post);

  if (!emailSize?.overLimit) {
    return null;
  }

  return (
    <Inline
      align="start"
      className="border-b border-border-default bg-state-warning/10 p-4"
      data-testid={postPreviewEmailSizeWarning}
      gap="md"
    >
      <LucideIcon.MailWarning className="size-5 shrink-0 text-state-warning" />
      <Stack gap="xs">
        <Text size="sm" weight="semibold">
          This newsletter is <span className="text-state-warning">{emailSize.sizeKb}kB</span>
        </Text>
        <Text size="sm" tone="secondary">
          Emails may get clipped in the inbox behind a “View entire message” link when they’re over
          100kB.
        </Text>
      </Stack>
    </Inline>
  );
}

interface EmailPreviewProps {
  subjectEditor?: EmailSubjectEditor;
  postId: string;
  post?: PublishFlowPost;
  audience: PreviewAudience;
  /** The selected tier's name, for the test-email audience description. */
  tierName?: string;
  canSendTestEmail: boolean;
  device: PreviewDevice;
  newsletters: Newsletter[];
  newsletterSlug?: string;
  /** Refreshing either newsletter query failed, so cached newsletter data is unsafe to use. */
  newsletterLookupError?: boolean;
  /** The active or post newsletter is still being refreshed from the server. */
  newsletterLookupPending?: boolean;
  /** The post's newsletter was looked up and no longer exists. */
  newsletterMissing?: boolean;
  onNewsletterChange: (slug: string) => void;
  onRetryNewsletterLookup: () => void;
}

export function EmailPreview({
  subjectEditor,
  postId,
  post,
  audience,
  tierName,
  canSendTestEmail,
  device,
  newsletters,
  newsletterSlug,
  newsletterLookupError = false,
  newsletterLookupPending = false,
  newsletterMissing = false,
  onNewsletterChange,
  onRetryNewsletterLookup,
}: EmailPreviewProps) {
  const { data: settingsData } = useEditorSettings();
  const { data: configData } = useBrowseConfig({ requestOptions: EDITOR_REQUEST_OPTIONS });
  const [defaultEmailAddress] = getSettingValues<string>(settingsData?.settings ?? [], [
    'default_email_address',
  ]);
  const { data, isError, isFetching, refetch } = useEmailPreview(postId, {
    ...emailPreviewAudience(audience),
    enabled: !newsletterLookupError && !newsletterLookupPending && !newsletterMissing,
    newsletter: newsletterSlug,
    requestOptions: EDITOR_REQUEST_OPTIONS,
    staleTime: 0,
  });

  const preview = data?.email_previews[0];
  // Only the newsletter the preview was requested for, so the From line, the
  // selection and the test send can never name a different one.
  const selectedNewsletter = newsletters.find((newsletter) => newsletter.slug === newsletterSlug);
  const config = configData?.config;
  // Managed email can override the newsletter's sender, so no address until config is read.
  const senderAddress = (sender: string | null) =>
    config ? senderEmailAddress(sender, defaultEmailAddress ?? '', config) : '';

  const Frame = device === 'mobile' ? PreviewChrome : Box;

  return (
    <Frame
      className={
        device === 'desktop'
          ? 'size-full max-w-[720px] overflow-hidden rounded-xl shadow-xl'
          : 'max-w-full shrink-0'
      }
      data-testid={postPreviewEmail}
      {...(device === 'mobile' ? { device } : {})}
    >
      <Stack className="size-full bg-background" gap="none">
        <Grid
          align="center"
          className="grid-cols-[auto_minmax(0,1fr)] border-b border-border-default p-4 [--control-height:28px]"
          gap="md"
        >
          <span className="text-sm text-muted-foreground">From</span>
          <Inline className="min-w-0" gap="lg" justify="between">
            <Box className="min-w-0 flex-1">
              {newsletterLookupPending ? (
                <LoadingIndicator size="sm" />
              ) : newsletterLookupError ? (
                <p className="min-w-0 truncate text-sm text-muted-foreground">
                  Couldn’t load newsletters
                </p>
              ) : newsletterMissing ? (
                <p
                  className="min-w-0 truncate text-sm text-muted-foreground"
                  data-testid={postPreviewNewsletterMissing}
                >
                  This newsletter no longer exists
                </p>
              ) : newsletters.length > 1 ? (
                <Select value={selectedNewsletter?.slug} onValueChange={onNewsletterChange}>
                  <SelectTrigger
                    aria-label="Newsletter"
                    className="w-auto max-w-full min-w-0 [&>span]:min-w-0 [&>span]:truncate [&>svg]:shrink-0"
                    title={`${selectedNewsletter?.name ?? ''} <${senderAddress(selectedNewsletter?.sender_email ?? null)}>`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {newsletters.map((newsletter) => (
                      <SelectItem key={newsletter.id} value={newsletter.slug}>
                        {newsletter.name} &lt;{senderAddress(newsletter.sender_email)}&gt;
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="min-w-0 truncate text-sm" data-testid={postPreviewEmailFrom}>
                  {selectedNewsletter?.name}{' '}
                  <span className="text-muted-foreground">
                    &lt;{senderAddress(selectedNewsletter?.sender_email ?? null)}&gt;
                  </span>
                </p>
              )}
            </Box>
            {canSendTestEmail && (
              <SendTestEmail
                audience={audience}
                audienceLabel={audienceDescription(audience, tierName)}
                disabled={
                  newsletterLookupError ||
                  newsletterLookupPending ||
                  newsletterMissing ||
                  subjectEditor?.hasUnsavedChanges ||
                  subjectEditor?.isSaving
                }
                newsletterSlug={newsletterSlug}
                postId={postId}
              />
            )}
          </Inline>
          <span className="self-start text-sm leading-(--control-height) text-muted-foreground">
            Subject
          </span>
          {subjectEditor && device === 'desktop' ? (
            <EmailSubject editor={subjectEditor} ownsSaveError />
          ) : (
            <p className="min-w-0 truncate text-sm" data-testid={postPreviewEmailSubject}>
              {subjectEditor
                ? subjectEditor.value || subjectEditor.fallback
                : !isFetching && preview?.subject}
            </p>
          )}
        </Grid>
        {post ? <EmailSizeBanner post={post} /> : null}
        {newsletterLookupPending || isFetching ? (
          <Inline className="grow" gap="none" justify="center">
            <LoadingIndicator size="md" />
          </Inline>
        ) : newsletterLookupError ? (
          <EmptyIndicator
            actions={
              <Button variant="outline" onClick={onRetryNewsletterLookup}>
                Retry
              </Button>
            }
            className="grow justify-center"
            data-testid={postPreviewNewslettersError}
            description="The newsletters could not be loaded."
            title="Couldn’t load newsletters"
          >
            <LucideIcon.TriangleAlert />
          </EmptyIndicator>
        ) : isError ? (
          <EmptyIndicator
            actions={
              <Button variant="outline" onClick={() => void refetch()}>
                Retry
              </Button>
            }
            className="grow justify-center"
            description="The email preview could not be loaded."
            title="Couldn’t load the email preview"
          >
            <LucideIcon.TriangleAlert />
          </EmptyIndicator>
        ) : newsletterMissing ? (
          <EmptyIndicator
            className="grow justify-center"
            description="Choose an active newsletter before sending this post."
            title="Newsletter unavailable"
          >
            <LucideIcon.MailWarning />
          </EmptyIndicator>
        ) : (
          <iframe
            className="min-h-0 grow border-0"
            data-testid={postPreviewEmailFrame}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            srcDoc={withPreviewDocumentStyles(preview?.html ?? '')}
            title="Email preview"
          />
        )}
      </Stack>
    </Frame>
  );
}
