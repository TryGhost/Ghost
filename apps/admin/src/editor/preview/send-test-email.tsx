import { useState } from 'react';
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
import { Stack } from '@tryghost/shade/primitives';
import { getSettingValues, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { toast } from 'sonner';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import { useSendTestEmail } from '@tryghost/admin-x-framework/api/email-previews';

import { emailPreviewAudience, type PreviewAudience } from './preview-url';

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
  const { data: currentUser } = useCurrentUser();
  const { data: configData } = useBrowseConfig();
  const { data: settingsData } = useBrowseSettings();
  const { mutateAsync: sendTestEmail, isPending } = useSendTestEmail();
  const handleError = useHandleError();
  const [editedAddress, setEditedAddress] = useState<string | null>(null);

  const address = editedAddress ?? currentUser?.email ?? '';
  const [mailgunApiKey, mailgunDomain, mailgunBaseUrl] = getSettingValues<string>(
    settingsData?.settings ?? [],
    ['mailgun_api_key', 'mailgun_domain', 'mailgun_base_url'],
  );
  const mailgunIsConfigured =
    Boolean(configData?.config.mailgunIsConfigured) ||
    Boolean(mailgunApiKey && mailgunDomain && mailgunBaseUrl);

  const send = async () => {
    const recipient = address.trim();

    if (disabled) {
      return;
    }

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
      handleError(error);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
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
            <Label htmlFor="post-preview-test-email">Send test email</Label>
            <Input
              data-testid="post-preview-test-email-input"
              id="post-preview-test-email"
              placeholder="you@yoursite.com"
              type="email"
              value={address}
              onChange={(event) => setEditedAddress(event.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              You&rsquo;ll receive this as a {audienceLabel}.
            </p>
            <Button disabled={disabled || isPending} type="submit">
              {isPending ? 'Sending...' : 'Send'}
            </Button>
          </Stack>
        </form>
      </PopoverContent>
    </Popover>
  );
}
