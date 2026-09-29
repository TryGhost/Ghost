import { createContext, lazy, Suspense, useContext, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from '@tryghost/admin-x-framework';
import { isAuthPath } from '@tryghost/admin-x-framework/helpers';
import { toast } from 'sonner';
import { EmberFallback } from '@/ember-bridge';
import { useSetupStatus } from './client/auth-client';
import { rememberSigninRedirect } from './signin-redirect';
import { useAuthScreensOwner } from './use-auth-screens-owner';

const screens = {
  signin: lazy(() => import('./signin')),
  signinVerify: lazy(() => import('./signin-verify')),
  signout: lazy(() => import('./signout')),
  signup: lazy(() => import('./signup')),
  reset: lazy(() => import('./reset')),
  setup: lazy(() => import('./setup')),
};

export type AuthScreen = keyof typeof screens;

// Set by the signed-out shell; auth routes rendered anywhere else are being
// visited by someone who is signed in.
const SignedOutContext = createContext(false);

const SIGNED_IN_WARNINGS: Partial<Record<AuthScreen, string>> = {
  reset: "You can't reset your password while you're signed in.",
  signup: 'You need to sign out to register as a new user.',
};

function SignedInRedirect({ screen }: { screen: AuthScreen }) {
  const warning = SIGNED_IN_WARNINGS[screen];

  useEffect(() => {
    if (warning) {
      toast.warning(warning, { id: 'auth-signed-in' });
    }
  }, [warning]);

  return <Navigate to="/" replace />;
}

/** Serves an auth route from React or Ember, whichever owns the auth screens. */
export function AuthRoute({ screen }: { screen: AuthScreen }) {
  const owner = useAuthScreensOwner();
  const signedOut = useContext(SignedOutContext);
  const Screen = screens[screen];

  if (owner === 'pending') {
    return null;
  }
  if (owner === 'ember') {
    return <EmberFallback />;
  }
  if (!signedOut && screen !== 'signout') {
    return <SignedInRedirect screen={screen} />;
  }
  return (
    <Suspense fallback={null}>
      <Screen />
    </Suspense>
  );
}

/**
 * The whole app for a signed-out visitor while React owns the auth screens:
 * auth routes render, anything else is remembered for after sign in and
 * sends the visitor to sign in. A site that isn't set up yet sends every
 * auth screen but sign out to setup.
 */
export function SignedOutApp() {
  const { pathname, search } = useLocation();
  const setup = useSetupStatus();
  const route = pathname.replace(/\/$/, '') || '/';

  if (!isAuthPath(pathname)) {
    rememberSigninRedirect(pathname + search);
    return <Navigate to="/signin" replace />;
  }
  if (setup.isPending) {
    return null;
  }
  if (setup.data && !setup.data.isSetup && route !== '/setup' && route !== '/signout') {
    return <Navigate to="/setup" replace />;
  }
  return (
    <SignedOutContext.Provider value={true}>
      <Outlet />
    </SignedOutContext.Provider>
  );
}
