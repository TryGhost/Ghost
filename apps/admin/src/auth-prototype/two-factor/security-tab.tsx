import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { type User, hasAdminAccess } from '@tryghost/admin-x-framework/api/users';
import { toast } from 'sonner';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { isSsoConfigured, updateTwoFactor, useDemoState } from '@/auth-prototype/demo-store';
import { BACKUP_CODES, emailDomain, makeBackupCodes } from '@/auth-prototype/fake';
import { getProvider } from '@/auth-prototype/sso/providers';
import { AuthenticatorSetupDialog } from './authenticator-setup';
import { RegenerateDialog } from './regenerate-dialog';
import { NewCodesDialog } from './new-codes-dialog';
import { Reset2faCard } from './reset-2fa-card';
import { TurnOffDialog } from './turn-off-dialog';

function formatDate(iso: string | null) {
  const date = iso ? new Date(iso) : new Date();
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function TwoStepOff({ required, onSetUp }: { required: boolean; onSetUp: () => void }) {
  return (
    <Stack align="start" className="rounded-lg bg-muted p-4" gap="md">
      <Stack gap="xs">
        <Inline gap="sm">
          <Text as="h3" size="md" weight="semibold">
            Two-step verification
          </Text>
          <Badge variant="outline">Off</Badge>
          {required && <Badge variant="warning">Required</Badge>}
        </Inline>
        {/* 13px: Shade's text-base step, which the Text size scale skips. */}
        <Text className="text-base" tone="secondary">
          Each time you sign in, enter a code from an authenticator app like 1Password or Authy, so
          a stolen password isn’t enough to get in.
          {required &&
            ' This site requires it, so you’ll be asked to set it up next time you sign in.'}
        </Text>
      </Stack>
      <Button className="bg-surface-elevated" variant="outline" onClick={onSetUp}>
        Turn on
      </Button>
    </Stack>
  );
}

function AuthenticatorOn({
  addedAt,
  codesLeft,
  required,
  onNewCodes,
  onTurnOff,
}: {
  addedAt: string | null;
  codesLeft: number;
  required: boolean;
  onNewCodes: () => void;
  onTurnOff: () => void;
}) {
  return (
    <Stack align="start" className="rounded-lg bg-muted p-4" gap="md">
      <Stack gap="xs">
        <Inline gap="sm">
          <Text as="h3" size="md" weight="semibold">
            Two-step verification
          </Text>
          <Badge variant="success">On</Badge>
        </Inline>
        {/* 13px: Shade's text-base step, which the Text size scale skips. */}
        <Text className="text-base" tone="secondary">
          Authenticator app added {formatDate(addedAt)}, last used just now.{' '}
          <span className={codesLeft <= 3 ? 'text-destructive' : undefined}>
            {codesLeft} of 10 backup codes left.
          </span>
          {required && ' This site requires two-step verification, so it can’t be turned off.'}
        </Text>
      </Stack>
      <Inline gap="sm">
        <Button className="bg-surface-elevated" variant="outline" onClick={onNewCodes}>
          Get new codes
        </Button>
        {!required && (
          <Button variant="destructive-ghost" onClick={onTurnOff}>
            Turn off
          </Button>
        )}
      </Inline>
    </Stack>
  );
}

function OwnSecurity({ user, siteTitle }: { user: User; siteTitle: string }) {
  const demo = useDemoState();
  const [pendingCodes, setPendingCodes] = useState<string[]>(BACKUP_CODES);
  const [dialog, setDialog] = useState<'none' | 'setup' | 'regenerate' | 'new-codes' | 'turn-off'>(
    'none',
  );

  const ssoCovers =
    isSsoConfigured(demo.sso) &&
    demo.sso.required &&
    demo.sso.domains.includes(emailDomain(user.email));

  if (ssoCovers) {
    const provider = getProvider(demo.sso.provider);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Two-step verification</CardTitle>
          <CardDescription>
            You sign in with {provider.shortName}. {provider.shortName} handles your second factor.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      {demo.twoFactor.method === 'app' ? (
        <AuthenticatorOn
          addedAt={demo.twoFactor.addedAt}
          codesLeft={demo.twoFactor.backupCodes.length}
          required={demo.policy.requireTwoStep}
          onNewCodes={() => setDialog('regenerate')}
          onTurnOff={() => setDialog('turn-off')}
        />
      ) : (
        <TwoStepOff
          required={demo.policy.requireTwoStep}
          onSetUp={() => {
            setPendingCodes(BACKUP_CODES);
            setDialog('setup');
          }}
        />
      )}
      <AuthenticatorSetupDialog
        codes={pendingCodes}
        open={dialog === 'setup'}
        siteTitle={siteTitle}
        onCancel={() => setDialog('none')}
        onFinish={() => {
          updateTwoFactor({
            method: 'app',
            backupCodes: pendingCodes,
            addedAt: new Date().toISOString(),
          });
          setDialog('none');
          toast.success('Two-step verification is on', {
            description: `Next time you sign in, use a code from your app. We’ve emailed ${user.email} to let you know.`,
          });
        }}
      />
      <RegenerateDialog
        open={dialog === 'regenerate'}
        onCancel={() => setDialog('none')}
        onConfirmed={() => {
          setPendingCodes(makeBackupCodes());
          setDialog('new-codes');
        }}
      />
      <NewCodesDialog
        codes={pendingCodes}
        open={dialog === 'new-codes'}
        siteTitle={siteTitle}
        onCancel={() => setDialog('none')}
        onFinish={() => {
          updateTwoFactor({ backupCodes: pendingCodes });
          setDialog('none');
          toast.success('New backup codes saved', {
            description: `Your old codes no longer work. We’ve emailed ${user.email} to let you know.`,
          });
        }}
      />
      <TurnOffDialog
        open={dialog === 'turn-off'}
        onCancel={() => setDialog('none')}
        onConfirmed={() => {
          setDialog('none');
          updateTwoFactor({ method: 'email', addedAt: null, backupCodes: [...BACKUP_CODES] });
          toast.success('Two-step verification is off', {
            description: `We’ve emailed ${user.email} to let you know.`,
          });
        }}
      />
    </>
  );
}

/** Flow 3: the Security tab in the staff profile. */
export function SecurityTab({ user }: { user: User }) {
  const { currentUser, siteData } = useGlobalData();
  const siteTitle = siteData?.title || 'your site';

  if (user.id === currentUser.id) {
    return <OwnSecurity siteTitle={siteTitle} user={user} />;
  }
  if (hasAdminAccess(currentUser)) {
    return <Reset2faCard currentUserId={currentUser.id} user={user} />;
  }
  return null;
}
