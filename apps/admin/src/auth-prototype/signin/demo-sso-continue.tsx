import { useState } from 'react';
import { useNavigate } from '@tryghost/admin-x-framework';
import { Button, LoadingIndicator } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { AuthHeader } from '@/auth/auth-layout';
import { useDemoState } from '@/auth-prototype/demo-store';
import { fakeDelay } from '@/auth-prototype/fake';
import { useSiteTitle } from '@/auth-prototype/people';
import { getProvider } from '@/auth-prototype/sso/providers';
import { DemoShell, EmailChip, OrDivider } from './demo-shell';
import { getDemoEmail, useIsOwnerEmail } from './session';

/** Flow 2, step 2: "Continue with Okta", with the required (E1) and owner (E2) variants. */
export default function DemoSsoContinue() {
  const navigate = useNavigate();
  const { sso } = useDemoState();
  const siteTitle = useSiteTitle();
  const isOwnerEmail = useIsOwnerEmail();
  const email = getDemoEmail();
  const owner = isOwnerEmail(email);
  const provider = getProvider(sso.provider);
  const [running, setRunning] = useState(false);

  const continueWithProvider = async () => {
    setRunning(true);
    await fakeDelay(600);
    setRunning(false);
    if (sso.status === 'failing') {
      navigate('/auth-demo/result/unreachable');
    } else {
      navigate('/auth-demo/provider');
    }
  };

  return (
    <DemoShell>
      <Stack gap="lg">
        <AuthHeader title={`Sign in to ${siteTitle}`}>
          <EmailChip email={email} />
        </AuthHeader>
        <Text className="text-center" size="lg" tone="secondary">
          {sso.required
            ? `${siteTitle} requires you to sign in with ${provider.shortName}.`
            : `Your team signs in with ${provider.shortName}.`}
        </Text>
        <Button
          className="h-(--control-height) w-full bg-ghostaccent text-primary-foreground hover:bg-ghostaccent/90"
          disabled={running}
          size="lg"
          onClick={() => void continueWithProvider()}
        >
          {running ? (
            <LoadingIndicator color="light" size="sm" />
          ) : (
            `Continue with ${provider.shortName}`
          )}
        </Button>

        {owner ? (
          <Stack gap="md">
            <OrDivider label="site owner" />
            <Button
              className="h-(--control-height) w-full"
              size="lg"
              variant="outline"
              onClick={() => navigate('/auth-demo/password', { state: { owner: true } })}
            >
              Sign in with password instead
            </Button>
            <Text className="text-center" size="sm" tone="secondary">
              You’ll also need a code from your email or authenticator app.
            </Text>
          </Stack>
        ) : (
          !sso.required && (
            <Stack gap="md">
              <OrDivider />
              <Button
                className="h-(--control-height) w-full"
                size="lg"
                variant="outline"
                onClick={() => navigate('/auth-demo/password')}
              >
                Sign in with password
              </Button>
            </Stack>
          )
        )}
      </Stack>
    </DemoShell>
  );
}
