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
import { Inline, Stack } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { getSettingValues, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useEmailPreview } from '@tryghost/admin-x-framework/api/email-previews';
import type { Newsletter } from '@tryghost/admin-x-framework/api/newsletters';

import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import { SendTestEmail } from './send-test-email';
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

interface EmailPreviewProps {
  postId: string;
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
  postId,
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
  const { data: settingsData } = useBrowseSettings({ requestOptions: EDITOR_REQUEST_OPTIONS });
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
  const senderAddress = (sender: string | null) => sender ?? defaultEmailAddress ?? '';

  return (
    <PreviewChrome data-testid="post-preview-email" device={device}>
      <Stack className="size-full bg-background" gap="none">
        <Stack className="border-b border-border-default p-4" gap="md">
          <Inline gap="lg" justify="between">
            <Inline className="min-w-0" gap="md">
              {newsletterLookupPending ? (
                <LoadingIndicator size="sm" />
              ) : newsletterLookupError ? (
                <p className="min-w-0 truncate text-sm text-muted-foreground">
                  Couldn’t load newsletters
                </p>
              ) : newsletterMissing ? (
                <p
                  className="min-w-0 truncate text-sm text-muted-foreground"
                  data-testid="post-preview-newsletter-missing"
                >
                  This newsletter no longer exists
                </p>
              ) : (
                <>
                  <span className="shrink-0 text-sm text-muted-foreground">From</span>
                  {newsletters.length > 1 ? (
                    <Select value={selectedNewsletter?.slug} onValueChange={onNewsletterChange}>
                      <SelectTrigger aria-label="Newsletter" className="w-auto">
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
                    <p className="min-w-0 truncate text-sm" data-testid="post-preview-email-from">
                      {selectedNewsletter?.name}{' '}
                      <span className="text-muted-foreground">
                        &lt;{senderAddress(selectedNewsletter?.sender_email ?? null)}&gt;
                      </span>
                    </p>
                  )}
                </>
              )}
            </Inline>
            {canSendTestEmail && (
              <SendTestEmail
                audience={audience}
                audienceLabel={audienceDescription(audience, tierName)}
                disabled={newsletterLookupError || newsletterLookupPending || newsletterMissing}
                newsletterSlug={newsletterSlug}
                postId={postId}
              />
            )}
          </Inline>
          <Inline className="min-w-0" gap="md">
            <span className="shrink-0 text-sm text-muted-foreground">Subject</span>
            <p className="min-w-0 truncate text-sm" data-testid="post-preview-email-subject">
              {!isFetching && preview?.subject}
            </p>
          </Inline>
        </Stack>
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
            data-testid="post-preview-newsletters-error"
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
            data-testid="post-preview-email-frame"
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            srcDoc={withPreviewDocumentStyles(preview?.html ?? '')}
            title="Email preview"
          />
        )}
      </Stack>
    </PreviewChrome>
  );
}
