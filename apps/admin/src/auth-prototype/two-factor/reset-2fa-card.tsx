import { type ReactNode, useState } from 'react';
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
  Badge,
  Button,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { type User } from '@tryghost/admin-x-framework/api/users';
import { toast } from 'sonner';
import { setDemoState, useDemoState } from '@/auth-prototype/demo-store';
import { fakeDelay } from '@/auth-prototype/fake';
import { getProvider } from '@/auth-prototype/sso/providers';
import { staffSignInMethod } from './staff-method';

/** The grey box shared with your own Security tab. */
function TwoStepBox({
  badge,
  description,
  children,
}: {
  badge: ReactNode;
  description: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Stack align="start" className="rounded-lg bg-muted p-4" gap="md">
      <Stack gap="xs">
        <Inline gap="sm">
          <Text as="h3" size="md" weight="semibold">
            Two-step verification
          </Text>
          {badge}
        </Inline>
        {/* 13px: Shade's text-base step, which the Text size scale skips. */}
        <Text className="text-base" tone="secondary">
          {description}
        </Text>
      </Stack>
      {children}
    </Stack>
  );
}

/** E5: an Administrator resets someone else's two-step verification. */
export function Reset2faCard({ user, currentUserId }: { user: User; currentUserId: string }) {
  const demo = useDemoState();
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const method = staffSignInMethod(user, currentUserId, demo);
  const firstName = user.name?.split(' ')[0] || user.email;

  const reset = async () => {
    setRunning(true);
    await fakeDelay();
    setRunning(false);
    setConfirming(false);
    setDemoState((current) => ({
      ...current,
      twoFactor: {
        ...current.twoFactor,
        resetUserIds: [...new Set([...current.twoFactor.resetUserIds, user.id])],
      },
    }));
    toast.success('Two-step verification reset', {
      description: `We emailed ${firstName} to let them know.`,
    });
  };

  if (method === 'sso') {
    const provider = getProvider(demo.sso.provider);
    return (
      <TwoStepBox
        badge={<Badge variant="secondary">Single sign-on</Badge>}
        description={`${firstName} signs in with ${provider.shortName}. ${provider.shortName} handles their second factor, so there’s nothing to reset in Ghost.`}
      />
    );
  }

  if (method !== 'app') {
    return (
      <TwoStepBox
        badge={<Badge variant="outline">Off</Badge>}
        description={`${firstName} hasn’t turned on two-step verification, so there’s nothing to reset.`}
      />
    );
  }

  return (
    <TwoStepBox
      badge={<Badge variant="success">On</Badge>}
      description={`If ${firstName} lost their phone and their backup codes, reset their two-step verification. They’ll sign in with just their password, then can turn two-step back on. We’ll email ${firstName} to let them know.`}
    >
      <Button
        className="bg-surface-elevated text-destructive"
        variant="outline"
        onClick={() => setConfirming(true)}
      >
        Reset two-step verification
      </Button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset {firstName}’s two-step verification?</AlertDialogTitle>
            <AlertDialogDescription>
              Their authenticator app and backup codes stop working. Next time they sign in, they
              only need their password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Banner variant="info">
            <Text size="md">Only do this if you’re sure it’s really {firstName} asking.</Text>
          </Banner>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={running}
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                void reset();
              }}
            >
              {running ? 'Resetting…' : 'Reset'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TwoStepBox>
  );
}
