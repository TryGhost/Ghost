import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';

export type WelcomeEmailType = 'free' | 'paid';

export const WELCOME_EMAIL_SLUGS: Record<WelcomeEmailType, string> = {
    free: 'member-welcome-email-free',
    paid: 'member-welcome-email-paid'
};

// Uses __GHOST_URL__ placeholder which Ghost replaces with the actual site URL.
const DEFAULT_FREE_LEXICAL_CONTENT = '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Welcome! Thanks for subscribing — it\'s great to have you here.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"You\'ll now receive new posts straight to your inbox. You can also log in any time to read the ","type":"extended-text","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"full archive","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"link","version":1,"rel":"noreferrer","target":null,"title":null,"url":"__GHOST_URL__/"},{"detail":0,"format":0,"mode":"normal","style":"","text":" or catch up on new posts as they go live.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"A little housekeeping: If this email landed in spam or promotions, try moving it to your primary inbox and adding this address to your contacts. Small signals like that help your inbox recognize that these messages matter to you.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Have questions or just want to say hi? Feel free to reply directly to this email or any newsletter in the future.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

const DEFAULT_PAID_LEXICAL_CONTENT = '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Welcome, and thank you for your support — it means a lot.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"As a paid member, you now have full access to everything: the complete archive, and any paid-only content going forward. New posts will land straight to your inbox, and you can log in any time to ","type":"extended-text","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"catch up","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"link","version":1,"rel":"noreferrer","target":null,"title":null,"url":"__GHOST_URL__/"},{"detail":0,"format":0,"mode":"normal","style":"","text":" on anything you\'ve missed.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"A little housekeeping: If this email landed in spam or promotions, try moving it to your primary inbox and adding this address to your contacts. Small signals like that help your inbox recognize that these messages matter to you.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Have questions or just want to say hi? Feel free to reply directly to this email or any newsletter in the future.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

export const getDefaultWelcomeEmailValues = (emailType: WelcomeEmailType, siteTitle: string | null | undefined) => ({
    name: emailType === 'free' ? 'Welcome Email (Free)' : 'Welcome Email (Paid)',
    slug: WELCOME_EMAIL_SLUGS[emailType],
    subject: emailType === 'free'
        ? `Welcome to ${siteTitle || 'our site'}`
        : 'Welcome to your paid subscription',
    lexical: emailType === 'free' ? DEFAULT_FREE_LEXICAL_CONTENT : DEFAULT_PAID_LEXICAL_CONTENT
});

export const getDefaultWelcomeEmailRecord = (emailType: WelcomeEmailType, siteTitle: string | null | undefined): AutomatedEmail => ({
    id: '',
    status: 'inactive',
    ...getDefaultWelcomeEmailValues(emailType, siteTitle),
    sender_name: null,
    sender_email: null,
    sender_reply_to: null,
    created_at: '',
    updated_at: null
});
