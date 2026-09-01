/**
 * A member's own view of their own record, as the members API serves it to Portal.
 * See CONTEXT.md for the language.
 *
 * A barrel rather than a composition root: this module owns no boot step, and its
 * collaborators are the ones `members-api.js` already builds, so the service is
 * constructed there beside `MemberBREADService`. Answering a request belongs to the
 * endpoint, not here.
 */
export { MemberAccountService } from './service';
export { MemberAccount, type DecodeDependencies } from './models';
export { toAccountResponse } from './serializers';
export { UpdateAccount } from './commands';
