// Signup context describes the sign-in state when the Stripe checkout session is created.
// NEEDS_MAGIC_LINK_EMAIL: No guaranteed sign-in path exists yet (custom/direct checkout paths).
// HAS_PRECHECKOUT_MAGIC_LINK: Ghost generated a signup magic-link before Stripe (standard Portal flow).
// ALREADY_AUTHENTICATED: Request came from a signed-in member identity (for example, opening a paid signup link directly).
export const SIGNUP_CONTEXTS = {
    NEEDS_MAGIC_LINK_EMAIL: 'needs_magic_link_email',
    HAS_PRECHECKOUT_MAGIC_LINK: 'has_precheckout_magic_link',
    ALREADY_AUTHENTICATED: 'already_authenticated'
} as const;

export type SignupContext = typeof SIGNUP_CONTEXTS[keyof typeof SIGNUP_CONTEXTS];

/**
 * Signup-paid email can be skipped when welcome email is active only if
 * checkout already has a reliable sign-in path.
 *
 * - HAS_PRECHECKOUT_MAGIC_LINK: standard Portal flow generated signup link before Stripe
 * - ALREADY_AUTHENTICATED: checkout request came from an already signed-in member
 */
export function canWelcomeEmailReplaceSignupPaidEmail(signupContext?: SignupContext) {
    return signupContext === SIGNUP_CONTEXTS.HAS_PRECHECKOUT_MAGIC_LINK || signupContext === SIGNUP_CONTEXTS.ALREADY_AUTHENTICATED;
}
