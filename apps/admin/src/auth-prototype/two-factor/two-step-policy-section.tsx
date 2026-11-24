import { useState } from 'react';
import { Label, Separator, Switch } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';
import { toast } from 'sonner';
import useStaffUsers from '@/settings/hooks/use-staff-users';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { isSsoConfigured, updatePolicy, useDemoState } from '@/auth-prototype/demo-store';
import { getProvider } from '@/auth-prototype/sso/providers';
import { RequireTwoStepDialog } from './require-two-step-dialog';
import { staffSignInMethod } from './staff-method';

function SwitchRow({
  id,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Inline align="start" gap="lg" justify="between">
      <Stack gap="xs">
        <Label className="text-md font-semibold" htmlFor={id}>
          {title}
        </Label>
        <Text size="sm" tone="secondary">
          {description}
        </Text>
      </Stack>
      <Switch checked={checked} id={id} onCheckedChange={onCheckedChange} />
    </Inline>
  );
}

/** The site-wide two-step rules in Settings > Security. Setting it up stays on each person's profile. */
export function TwoStepPolicySection() {
  const demo = useDemoState();
  const { currentUser } = useGlobalData();
  const { users } = useStaffUsers();
  const [confirming, setConfirming] = useState(false);

  // Staff on SSO aren't counted: their provider handles the second step.
  const affected = users.filter((user) => staffSignInMethod(user, currentUser.id, demo) !== 'sso');
  const withTwoStep = affected.filter(
    (user) => staffSignInMethod(user, currentUser.id, demo) === 'app',
  );
  const withoutTwoStep = affected
    .filter((user) => staffSignInMethod(user, currentUser.id, demo) === 'email')
    .map((user) => user.email);
  const ssoProviderName = isSsoConfigured(demo.sso)
    ? getProvider(demo.sso.provider).shortName
    : null;
  const { requireTwoStep, emailCodeEverySignin } = demo.policy;

  return (
    <>
      <Stack gap="lg">
        <SwitchRow
          checked={requireTwoStep}
          description={`Staff need an authenticator app to sign in. ${formatNumber(withTwoStep.length)} of ${formatNumber(affected.length)} have it on.${ssoProviderName ? ` Staff on ${ssoProviderName} aren’t affected.` : ''}`}
          id="auth-prototype-require-two-step"
          title="Require two-step verification for all staff"
          onCheckedChange={(checked) => {
            if (checked) {
              setConfirming(true);
            } else {
              updatePolicy({ requireTwoStep: false });
              toast.success('Two-step verification is no longer required', {
                description: 'Staff who turned it on keep using it.',
              });
            }
          }}
        />
        {!requireTwoStep && (
          <>
            <Separator />
            <SwitchRow
              checked={emailCodeEverySignin}
              description="For staff without two-step. Otherwise Ghost only emails a code when someone signs in on a new device."
              id="auth-prototype-email-every-signin"
              title="Email a code on every sign-in"
              onCheckedChange={(checked) => updatePolicy({ emailCodeEverySignin: checked })}
            />
          </>
        )}
      </Stack>
      <RequireTwoStepDialog
        open={confirming}
        ssoProviderName={ssoProviderName}
        withoutTwoStep={withoutTwoStep}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          updatePolicy({ requireTwoStep: true });
          toast.success('Two-step verification is now required', {
            description: withoutTwoStep.length
              ? `We’ve emailed ${formatNumber(withoutTwoStep.length)} staff to set it up.`
              : undefined,
          });
        }}
      />
    </>
  );
}
