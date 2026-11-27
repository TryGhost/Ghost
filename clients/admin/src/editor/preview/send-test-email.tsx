import { useId, useState } from 'react';
import validator from 'validator';
import {
  Button,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { Stack, Text } from '@tryghost/shade/primitives';
import { getSettingValues } from '@tryghost/admin-x-framework/api/settings';
import { toast } from 'sonner';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { SessionExpiredError } from '@tryghost/admin-x-framework/errors';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import { useSendTestEmail } from '@tryghost/admin-x-framework/api/email-previews';
import {
  postPreviewTestEmailError,
  postPreviewTestEmailInput,
} from '@tryghost/test-data/selectors/editor';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import { ReauthDialog } from '@/editor/session/reauth-dialog';
import { useEditorSettings } from '@/editor/use-editor-settings';

import { emailPreviewAudience, type PreviewAudience } from './preview-url';

const SESSION_EXPIRED = 'Your session expired. Send again to sign in.';

interface SendTestEmailProps {
  postId: string;
  audience: PreviewAudience;
  /** How the recipient's audience reads, e.g. "Gold tier member". */
  audienceLabel: string;
  newsletterSlug?: string;
  disabled?: boolean;
}

export function SendTestEmail({
  postId,
  audience,
  audienceLabel,
  newsletterSlug,
  disabled = false,
}: SendTestEmailProps) {
  const id = useId();
  const { data: currentUser } = useCurrentUser({ requestOptions: EDITOR_REQUEST_OPTIONS });
  const { data: configData } = useBrowseConfig({ requestOptions: EDITOR_REQUEST_OPTIONS });
  const { data: settingsData } = useEditorSettings();
  const { mutateAsync: sendTestEmail, isPending } = useSendTestEmail();
  const handleError = useHandleError();
  const [editedAddress, setEditedAddress] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const address = editedAddress ?? currentUser?.email ?? '';
  const [mailgunApiKey, mailgunDomain, mailgunBaseUrl] = getSettingValues<string>(
    settingsData?.settings ?? [],
    ['mailgun_api_key', 'mailgun_domain', 'mailgun_base_url'],
  );
  const mailgunIsConfigured =
    Boolean(configData?.config.mailgunIsConfigured) ||
    Boolean(mailgunApiKey && mailgunDomain && mailgunBaseUrl);
  // Until both have loaded, an unconfigured Mailgun can't be told from one not read yet.
  const mailgunStatusKnown = configData !== undefined && settingsData !== undefined;

  const send = async () => {
    const recipient = address.trim();

    if (disabled) {
      return;
    }

    setSendError(null);

    if (!validator.isEmail(recipient)) {
      toast.error('Please enter a valid email');
      return;
    }

    if (!mailgunIsConfigured) {
      toast.error('Please verify your email settings');
      return;
    }

    try {
      await sendTestEmail({
        postId,
        emails: [recipient],
        newsletter: newsletterSlug,
        ...emailPreviewAudience(audience),
      });
      toast.success(`Test email sent to ${recipient}`);
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        // The sign-in dialog renders inside the popover, so a closed one must reopen.
        setOpen(true);
        setSigningIn(true);
        return;
      }
      handleError(error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button className="shrink-0" disabled={disabled} variant="outline">
          <LucideIcon.Send />
          Test
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <Stack gap="md">
            <Label htmlFor={id}>Send test email</Label>
            <Input
              data-testid={postPreviewTestEmailInput}
              id={id}
              placeholder="you@yoursite.com"
              type="email"
              value={address}
              onChange={(event) => setEditedAddress(event.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              You&rsquo;ll receive this as a {audienceLabel}.
            </p>
            <Button disabled={disabled || isPending || !mailgunStatusKnown} type="submit">
              {isPending ? 'Sending...' : 'Send'}
            </Button>
            {sendError ? (
              <Text
                className="text-destructive"
                data-testid={postPreviewTestEmailError}
                role="alert"
                size="sm"
              >
                {sendError}
              </Text>
            ) : null}
          </Stack>
        </form>
        {/* Inside the popover so signing in leaves it open; outside the form, whose
            onSubmit the dialog's own submit would reach through the portal. */}
        <ReauthDialog
          email={currentUser?.email ?? ''}
          open={signingIn}
          onAbandoned={() => {
            setSigningIn(false);
            setSendError(SESSION_EXPIRED);
          }}
          onSucceeded={() => {
            setSigningIn(false);
            void send();
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
