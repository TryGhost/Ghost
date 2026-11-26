import type { Site } from '#support/site';
import type { MemberCreatedEvent } from '../../../shared/transition/member-events';
import { verificationTrigger } from '../services/verification-trigger.service';

// Many members arriving at once through the API or Admin may mean the site's email
// sending needs the host's review. A site the host has verified is not checked.
export default async function triggerVerificationWhenMemberCreated(
  site: Site,
  event: MemberCreatedEvent,
) {
  const trigger = verificationTrigger(site);
  if (!trigger.isVerified()) {
    await trigger.handleMemberCreated(event);
  }
}
