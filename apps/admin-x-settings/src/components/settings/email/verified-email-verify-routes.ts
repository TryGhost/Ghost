export type VerifiedEmailRouteContext = {
    type: string;
    id?: string;
    key?: string;
    source?: string;
} | null | undefined;

export const getRouteForContext = (context?: VerifiedEmailRouteContext): string => {
    if (context?.source === 'email_customization') {
        if (context.type === 'newsletter' && context.id) {
            return `newsletters/customize/newsletter/${context.id}`;
        }

        if (context.type === 'automated_email' && context.id) {
            return `newsletters/customize/automation/${context.id}`;
        }
    }

    if (context?.type === 'newsletter' && context.id) {
        return `newsletters/${context.id}`;
    }

    if (context?.type === 'setting' && context.key === 'members_support_address') {
        return 'portal/edit';
    }

    return '';
};
