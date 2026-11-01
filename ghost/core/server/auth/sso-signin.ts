import type { SigninPage } from '@tryghost/adapter-base-sso';
import adapterManager from '../services/adapter-manager';

/**
 * Returns the SSO adapter's sign-in page, or null when password sign-in is
 * enabled
 */
export function getSSOSignin(): SigninPage | null {
  return adapterManager.getAdapter('sso').getSigninPage();
}
