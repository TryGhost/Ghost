import { type ReactNode, useState } from 'react';
import { useNavigate } from '@tryghost/admin-x-framework';
import { Banner, Link } from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import { AuthLayout } from '@/auth/auth-layout';
import { NotFound } from '@/shared/not-found';
import { useAuthPrototypeEnabled } from '@/auth-prototype/enabled';
import { STRIP_KEY, readSession, writeSession } from './session';

function PrototypeStrip() {
  const [dismissed, setDismissed] = useState(() => readSession(STRIP_KEY) === 'yes');
  const navigate = useNavigate();

  if (dismissed) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-30 flex justify-center p-3">
      <Banner
        className="w-full max-w-xl"
        size="sm"
        variant="info"
        dismissible
        onDismiss={() => {
          writeSession(STRIP_KEY, 'yes');
          setDismissed(true);
        }}
      >
        <Inline className="pr-8" gap="sm" justify="between">
          <Text as="span" size="sm">
            <span className="font-semibold">Prototype:</span> no real sign-in happens.
          </Text>
          <Link className="text-sm" asChild>
            <button type="button" onClick={() => navigate('/')}>
              Back to Admin
            </button>
          </Link>
        </Inline>
      </Banner>
    </div>
  );
}

/**
 * Every sign-in demo screen renders inside the real AuthLayout, so it looks
 * like today's sign-in. While the prototype is off, the route is not found.
 */
export function DemoShell({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  const enabled = useAuthPrototypeEnabled();

  if (!enabled) {
    return <NotFound />;
  }

  return (
    <>
      <PrototypeStrip />
      {bare ? children : <AuthLayout>{children}</AuthLayout>}
    </>
  );
}

/** The "or" divider between sign-in options. */
export function OrDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/** The email being signed in with, and a way back to change it. */
export function EmailChip({ email }: { email: string }) {
  const navigate = useNavigate();
  return (
    <Inline className="rounded-full bg-secondary px-3 py-1.5" gap="sm" justify="center">
      <Text as="span" size="md">
        {email || 'No email'}
      </Text>
      <Link className="text-sm" asChild>
        <button
          type="button"
          onClick={() => navigate(`/auth-demo?as=${encodeURIComponent(email)}`)}
        >
          Change
        </button>
      </Link>
    </Inline>
  );
}
