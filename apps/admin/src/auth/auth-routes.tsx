import type { RouteObject } from '@tryghost/admin-x-framework';
import { AuthRoute, type AuthScreen } from './auth-route';

const authRoute = (path: string, screen: AuthScreen): RouteObject => ({
  path,
  element: <AuthRoute screen={screen} />,
});

export const authRoutes: RouteObject[] = [
  authRoute('/signin', 'signin'),
  authRoute('/signin/verify', 'signinVerify'),
  authRoute('/signout', 'signout'),
  authRoute('/signup/:token', 'signup'),
  authRoute('/reset/:token', 'reset'),
  authRoute('/setup', 'setup'),
];
