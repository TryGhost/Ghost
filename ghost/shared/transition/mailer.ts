/** The legacy mailer. It opens a mail transport when it is made, so one is made and kept for the process. */
import { forSiteWhenAsked } from './for-site';

type Mailer = {
  send(message: { to: string; subject: string; html: string; text: string }): Promise<unknown>;
};

let legacy: Mailer | undefined;

export const mailer = forSiteWhenAsked(
  () => (legacy ??= new (require('../../core/server/lib/mail').GhostMailer)() as Mailer),
);
