import {Meta, createMutation, createQuery} from '../utils/apiRequests';

export type Newsletter = {
    id: string;
    uuid: string;
    name: string;
    description: string | null;
    feedback_enabled: boolean;
    slug: string;
    sender_name: string | null;
    sender_email: string | null;
    sender_reply_to: string;
    status: string;
    visibility: string;
    subscribe_on_signup: boolean;
    sort_order: number;
    header_image: string | null;
    show_header_icon: boolean;
    show_header_title: boolean;
    title_font_category: string;
    title_alignment: string;
    show_feature_image: boolean;
    body_font_category: string;
    footer_content: string | null;
    show_badge: boolean;
    show_header_name: boolean;
    show_post_title_section: boolean;
    show_comment_cta: boolean;
    show_subscription_details: boolean;
    show_latest_posts: boolean;
    background_color: string;
    border_color: string | null;
    title_color: string | null;
    created_at: string;
    updated_at: string;
    count?: {
        posts?: number;
        active_members?: number;
    }
}

export interface NewslettersResponseType {
    meta?: Meta
    newsletters: Newsletter[]
}

const dataType = 'NewslettersResponseType';

export const useBrowseNewsletters = createQuery<NewslettersResponseType>({
    dataType,
    path: '/newsletters/',
    defaultSearchParams: {include: 'count.active_members,count.posts', limit: 'all'}
});

export const useAddNewsletter = createMutation<NewslettersResponseType, Partial<Newsletter> & {opt_in_existing: boolean}>({
    method: 'POST',
    path: () => '/newsletters/',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    body: ({opt_in_existing: _, ...newsletter}) => ({newsletters: [newsletter]}),
    searchParams: payload => ({opt_in_existing: payload.opt_in_existing.toString(), include: 'count.active_members,count.posts'}),
    updateQueries: {
        dataType,
        update: (newData, currentData) => ({
            ...(currentData as NewslettersResponseType),
            newsletters: (currentData as NewslettersResponseType).newsletters.concat(newData.newsletters)
        })
    }
});

export interface NewslettersEditResponseType extends NewslettersResponseType {
    meta?: Meta & {sent_email_verification: string[]}
}

export const useEditNewsletter = createMutation<NewslettersEditResponseType, Newsletter>({
    method: 'PUT',
    path: newsletter => `/newsletters/${newsletter.id}/`,
    body: newsletter => ({newsletters: [newsletter]}),
    defaultSearchParams: {include: 'count.active_members,count.posts'},
    updateQueries: {
        dataType,
        update: (newData, currentData) => ({
            ...(currentData as NewslettersResponseType),
            newsletters: (currentData as NewslettersResponseType).newsletters.map((newsletter) => {
                const newNewsletter = newData.newsletters.find(({id}) => id === newsletter.id);
                return newNewsletter || newsletter;
            })
        })
    }
});
