import type { Site } from '#support/site';
import { verificationTrigger } from '../services/verification-trigger.service';

/**
 * Says whether the host must verify this site before it may send email. Asking
 * also runs the checks that may start that verification. `newsletterSend` adds
 * the checks that are only worth their cost before a newsletter is sent.
 */
export function checkVerificationRequired(
  site: Site,
  options?: { newsletterSend?: boolean },
): Promise<boolean> {
  return verificationTrigger(site).checkVerificationRequired(options);
}
