import { type ReactNode, useState } from 'react';
import { useLocation, useNavigate, useParams } from '@tryghost/admin-x-framework';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { Banner, Button, Link, LoadingIndicator, Skeleton } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { toast } from 'sonner';
import { AuthHeader } from '@/auth/auth-layout';
import { useDemoState } from '@/auth-prototype/demo-store';
import { fakeDelay } from '@/auth-prototype/fake';
import { useSiteTitle } from '@/auth-prototype/people';
import { getProvider } from '@/auth-prototype/sso/providers';
import { DemoShell } from './demo-shell';
import { getDemoEmail, useIsOwnerEmail } from './session';

function FullWidthButton({
  variant = 'default',
  onClick,
  children,
}: {
  variant?: 'default' | 'outline';
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button className="h-(--control-height) w-full" size="lg" variant={variant} onClick={onClick}>
      {children}
    </Button>
  );
}

/** Flow 2 end states: no access (E3), join (E3, auto-join), rejected (E4), unreachable (E5). */
export function DemoSsoResult() {
  const { kind } = useParams();
  const navigate = useNavigate();
  const { sso } = useDemoState();
  const siteTitle = useSiteTitle();
  const isOwnerEmail = useIsOwnerEmail();
  const email = getDemoEmail();
  const provider = getProvider(sso.provider);
  const [joining, setJoining] = useState(false);
  const backToSignin = () => navigate(`/auth-demo?as=${encodeURIComponent(email)}`);
  const join = async () => {
    setJoining(true);
    await fakeDelay();
    toast.success(`Welcome to ${siteTitle}`);
    navigate('/auth-demo/done', { state: { via: 'sso' } });
  };

  if (kind === 'no-access') {
    return (
      <DemoShell>
        <Stack gap="lg">
          <AuthHeader title="You don’t have access yet" />
          <Banner role="alert" variant="warning">
            <Text size="md">
              {provider.shortName} signed you in as {email}, but there’s no staff account for that
              email on {siteTitle}. Ask a site Administrator to invite you.
            </Text>
          </Banner>
          <FullWidthButton onClick={backToSignin}>Back to sign in</FullWidthButton>
        </Stack>
      </DemoShell>
    );
  }

  if (kind === 'join') {
    return (
      <DemoShell>
        <Stack gap="lg">
          <AuthHeader title={`Join ${siteTitle}`}>
            <p className="text-lg text-muted-foreground">
              {provider.shortName} signed you in as {email}.
            </p>
          </AuthHeader>
          <Banner variant="info">
            <Text size="md">
              You’ll join as a
              {sso.autoJoinRole === 'Author' || sso.autoJoinRole === 'Editor' ? 'n' : ''}{' '}
              <span className="font-semibold">{sso.autoJoinRole}</span>. An Administrator can change
              your role later.
            </Text>
          </Banner>
          <Button
            className="h-(--control-height) w-full bg-ghostaccent text-primary-foreground hover:bg-ghostaccent/90"
            disabled={joining}
            size="lg"
            onClick={() => void join()}
          >
            {joining ? <LoadingIndicator color="light" size="sm" /> : 'Join site'}
          </Button>
        </Stack>
      </DemoShell>
    );
  }

  if (kind === 'rejected') {
    return (
      <DemoShell>
        <Stack gap="lg">
          <AuthHeader title={`${provider.shortName} didn’t sign you in`}>
            <p className="text-lg text-muted-foreground">
              {provider.shortName} said you aren’t allowed to use Ghost. You may not be assigned to
              the Ghost app in {provider.shortName}.
            </p>
          </AuthHeader>
          <FullWidthButton onClick={() => navigate('/auth-demo/sso')}>Try again</FullWidthButton>
          <FullWidthButton variant="outline" onClick={() => navigate('/auth-demo')}>
            Use a different email
          </FullWidthButton>
        </Stack>
      </DemoShell>
    );
  }

  // unreachable
  const canUsePassword = !sso.required || isOwnerEmail(email);
  return (
    <DemoShell>
      <Stack gap="lg">
        <AuthHeader title={`We can’t reach ${provider.shortName}`}>
          <p className="text-lg text-muted-foreground">
            {provider.shortName} didn’t answer in time. It may be down for a few minutes.
          </p>
        </AuthHeader>
        <FullWidthButton onClick={() => navigate('/auth-demo/sso')}>Try again</FullWidthButton>
        {canUsePassword && (
          <FullWidthButton
            variant="outline"
            onClick={() =>
              navigate('/auth-demo/password', { state: { owner: isOwnerEmail(email) } })
            }
          >
            Sign in with password
          </FullWidthButton>
        )}
      </Stack>
    </DemoShell>
  );
}

/** Flow 4 E5: lost both the device and the backup codes. */
export function DemoHelp() {
  const navigate = useNavigate();
  const siteTitle = useSiteTitle();
  const [sending, setSending] = useState(false);
  const emailOwner = async () => {
    setSending(true);
    await fakeDelay();
    setSending(false);
    toast.success('We emailed the site owner', {
      description: 'They’ll get in touch once they’ve reset it.',
    });
  };

  return (
    <DemoShell>
      <Stack gap="lg">
        <AuthHeader title="Can’t get a code?">
          <p className="text-lg text-muted-foreground">
            If you’ve lost your phone and your backup codes, the site owner or an Administrator of{' '}
            {siteTitle} can reset your two-step verification. Then you can sign in with just your
            password.
          </p>
        </AuthHeader>
        <Button
          className="h-(--control-height) w-full"
          disabled={sending}
          size="lg"
          onClick={() => void emailOwner()}
        >
          {sending ? <LoadingIndicator color="light" size="sm" /> : 'Email the site owner'}
        </Button>
        <Text className="text-center" size="sm" tone="secondary">
          Are you the owner?{' '}
          <Link href="#" onClick={(event) => event.preventDefault()}>
            Contact Ghost support
          </Link>
        </Text>
        <Link className="self-center text-sm" asChild>
          <button type="button" onClick={() => navigate('/auth-demo/code')}>
            Back to sign in
          </button>
        </Link>
      </Stack>
    </DemoShell>
  );
}

/** The signed-in end screen: a skeleton dashboard, with the low backup codes warning. */
export function DemoDone() {
  const navigate = useNavigate();
  const location = useLocation() as { state: { via?: string } | null };
  const { twoFactor } = useDemoState();
  const { data: currentUser } = useCurrentUser();
  const siteTitle = useSiteTitle();
  const usedAuthenticator = location.state?.via === 'app' || location.state?.via === 'backup';
  const codesLeft = twoFactor.backupCodes.length;

  return (
    <DemoShell bare>
      <div className="flex min-h-screen w-full bg-background">
        <aside className="hidden w-60 flex-col gap-3 border-r border-border-default bg-sidebar p-5 pt-20 md:flex">
          <Text size="md" weight="semibold">
            {siteTitle}
          </Text>
          <Skeleton className="h-4" containerClassName="flex flex-col gap-3" count={6} randomize />
        </aside>
        <main className="flex-1 p-8 pt-20">
          <Stack className="mx-auto max-w-3xl" gap="xl">
            {usedAuthenticator && codesLeft <= 3 && (
              <Banner variant="warning">
                <Inline gap="md" justify="between" wrap>
                  <Text size="md">
                    You have {codesLeft} backup {codesLeft === 1 ? 'code' : 'codes'} left. Get new
                    ones so you don’t get locked out.
                  </Text>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/settings/staff/${currentUser?.slug ?? ''}/security`)}
                  >
                    Get new codes
                  </Button>
                </Inline>
              </Banner>
            )}
            <Inline justify="between">
              <Text as="h1" size="2xl" weight="bold">
                You’re signed in
              </Text>
              <Inline gap="sm">
                <Button variant="ghost" onClick={() => navigate('/auth-demo')}>
                  Run again
                </Button>
                <Button onClick={() => navigate('/')}>Back to Admin</Button>
              </Inline>
            </Inline>
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-64" />
          </Stack>
        </main>
      </div>
    </DemoShell>
  );
}
