/** The legacy verification webhook sender, which tells the host that a site's email sending needs review. */
import { verificationWebhookService as legacy } from '../../core/server/services/verification/verification-webhook-service';
import { forSite } from './for-site';

export const verificationWebhook = forSite(legacy);
