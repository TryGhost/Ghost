import { isAuthPath } from '../../../src/utils/auth-paths';

describe('isAuthPath', () => {
  it.each([
    '/signin',
    '/signin/',
    '/signin/verify',
    '/signin?labs=authReact',
    '/signout',
    '/signup/aW52aXRl',
    '/reset/cmVzZXQ/',
    '/setup',
  ])('matches %s', (path) => {
    expect(isAuthPath(path)).toBe(true);
  });

  it.each([
    '/',
    '/setup/onboarding',
    '/setup/onboarding?returnTo=/analytics',
    '/signup',
    '/posts',
    '/signin-help',
  ])('does not match %s', (path) => {
    expect(isAuthPath(path)).toBe(false);
  });
});
