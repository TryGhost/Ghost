/**
 * The paywalls a publisher can set a default for.
 *
 * Web has two: the wall a post shows when it needs any membership, and the one
 * it shows when it needs a paid plan. Email has one - everyone receiving an
 * email is already a member, so the only upgrade an email can ask for is to a
 * paid plan.
 */
export type PaywallSurface = 'web' | 'email';
export type PaywallAccess = 'members' | 'paid';

/**
 * Each paywall is named by the posts it turns up on and the readers it stops -
 * the two things that decide whether this is the default you meant to change.
 * The card says what it requires; the label says who that leaves out, and where.
 *
 * A members-only post is readable by any member, free ones included, so the only
 * person it stops is someone who isn't signed in. A paid post stops free members
 * as well. Over email there are no visitors at all - everyone on the list is
 * already a member - so free members are the whole of it.
 *
 * Reader wording mirrors `web-paywall-audience` and `paywall-preview-audience`
 * in the editor, so the publish flow and this screen describe the same people
 * the same way.
 */
export const PAYWALLS: Record<PaywallSurface, {access: PaywallAccess, label: string}[]> = {
    web: [
        {access: 'members', label: 'On members-only posts, public visitors will see this'},
        {access: 'paid', label: 'On paid posts, free members and public visitors will see this'}
    ],
    email: [
        {access: 'paid', label: 'On paid posts, free members will see this'}
    ]
};

/**
 * A document holding one paywall card and nothing else.
 *
 * Deliberately bare: every default the card ships - Ghost's own headings and
 * body copy, per access level and per surface - is filled in by the node itself
 * when it is created without them. Repeating them here would be a second copy
 * to keep in step with the first.
 */
export function paywallCardState(access: PaywallAccess): string {
    return JSON.stringify({
        root: {
            children: [{type: 'paywall-v2', version: 1, access, tiers: []}],
            direction: null,
            format: '',
            indent: 0,
            type: 'root',
            version: 1
        }
    });
}
