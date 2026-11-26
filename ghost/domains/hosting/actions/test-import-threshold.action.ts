import type { Site } from '#support/site';
import { verificationTrigger } from '../services/verification-trigger.service';

/** Starts verification if more members were imported in the last 30 days than the host allows. */
export function testImportThreshold(site: Site): Promise<void> {
  return verificationTrigger(site).testImportThreshold();
}
