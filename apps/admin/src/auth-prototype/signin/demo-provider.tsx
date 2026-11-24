import { useState } from 'react';
import { useNavigate } from '@tryghost/admin-x-framework';
import { Badge, Button, LoadingIndicator, Skeleton } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { toast } from 'sonner';
import { getDemoState, useDemoState } from '@/auth-prototype/demo-store';
import { DEMO_EMAILS } from '@/auth-prototype/people';
import { fakeDelay } from '@/auth-prototype/fake';
import { getProvider } from '@/auth-prototype/sso/providers';
import { DemoShell } from './demo-shell';
import { getDemoEmail } from './session';

/**
 * A neutral stand-in for the provider's own sign-in page. It is deliberately
 * not styled like any real provider.
 */
export default function DemoProvider() {
  const navigate = useNavigate();
  const { sso } = useDemoState();
  const provider = getProvider(sso.provider);
  const email = getDemoEmail();
  const [running, setRunning] = useState(false);

  const signIn = async () => {
    setRunning(true);
    await fakeDelay(900);
    setRunning(false);
    const { signinScenario, sso: currentSso } = getDemoState();

    if (signinScenario.providerOutcome === 'rejected') {
      navigate('/auth-demo/result/rejected');
    } else if (signinScenario.providerOutcome === 'unreachable') {
      navigate('/auth-demo/result/unreachable');
    } else if (!signinScenario.hasStaffAccount || email === DEMO_EMAILS.newHire) {
      navigate(
        currentSso.provisioning === 'auto-join'
          ? '/auth-demo/result/join'
          : '/auth-demo/result/no-access',
      );
    } else {
      // E6: an SSO sign-in never shows a Ghost code step.
      toast.success(`Signed in with ${provider.shortName}`);
      navigate('/auth-demo/done', { state: { via: 'sso' } });
    }
  };

  return (
    <DemoShell bare>
      <div className="flex min-h-screen w-full items-center justify-center bg-muted px-6">
        <Stack
          className="w-full max-w-[360px] rounded-lg border border-border-default bg-surface-elevated p-8 shadow-md"
          gap="lg"
        >
          <Badge className="self-start" variant="secondary">
            Provider’s own page
          </Badge>
          <Stack gap="sm">
            <Text size="lg" weight="semibold">
              Your company’s sign-in page
            </Text>
            <Text size="sm" tone="secondary">
              In real life, {provider.shortName} shows its own screen here, with its own password
              and second factor.
            </Text>
          </Stack>
          <Stack gap="sm">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-4 w-1/2" />
          </Stack>
          <Button disabled={running} onClick={() => void signIn()}>
            {running ? (
              <LoadingIndicator color="light" size="sm" />
            ) : (
              `Sign in as ${email || 'you'}`
            )}
          </Button>
        </Stack>
      </div>
    </DemoShell>
  );
}
