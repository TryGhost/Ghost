import {InfiniteData} from '@tanstack/react-query';
import {Meta, createInfiniteQuery, createMutation, createQuery, createQueryWithId} from '../utils/api/hooks';
import {insertToQueryCache, updateQueryCache} from '../utils/api/update-queries';

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
    title_font_weight: string;
    title_alignment: string;
    show_excerpt: boolean;
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
    header_background_color: string;
    button_color: string | null;
    link_color: string | null;
    post_title_color: string | null;
    section_title_color: string | null;
    divider_color: string | null;
    button_corners: string | null;
    button_style: string | null;
    image_corners: string | null;
    link_style: string | null;
    divider_style: string | null;
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
export const newslettersDataType = dataType;
const activeNewslettersCountDataType = 'ActiveNewslettersCount';
const activeNewsletterSenderDefaultsDataType = 'ActiveNewsletterSenderDefaults';

export const useActiveNewslettersCount = createQuery<number | undefined>({
    dataType: activeNewslettersCountDataType,
    path: '/newsletters/',
    defaultSearchParams: {
        filter: 'status:active',
        limit: '1',
        fields: 'id'
    },
    returnData: (data) => {
        const total = (data as NewslettersResponseType).meta?.pagination.total;

        return typeof total === 'number' ? total : undefined;
    }
});

export type ActiveNewsletterSenderDefaults = Pick<Newsletter, 'id' | 'sender_name' | 'sender_email' | 'sender_reply_to'>;

export const useActiveNewsletterSenderDefaults = createQuery<ActiveNewsletterSenderDefaults | undefined>({
    dataType: activeNewsletterSenderDefaultsDataType,
    path: '/newsletters/',
    defaultSearchParams: {
        filter: 'status:active',
        limit: '1',
        fields: 'id,sender_name,sender_email,sender_reply_to'
    },
    returnData: (data) => {
        const newsletters = (data as NewslettersResponseType).newsletters;
        const [newsletter] = newsletters || [];

        if (!newsletter) {
            return;
        }

        return {
            id: newsletter.id,
            sender_name: newsletter.sender_name,
            sender_email: newsletter.sender_email,
            sender_reply_to: newsletter.sender_reply_to
        };
    }
});

export const useBrowseNewsletters = createInfiniteQuery<NewslettersResponseType & {isEnd: boolean}>({
    dataType,
    path: '/newsletters/',
    defaultSearchParams: {include: 'count.active_members,count.posts', limit: '50'},
    defaultNextPageParams: (lastPage, otherParams) => ({
        ...otherParams,
        page: (lastPage.meta?.pagination.next || 1).toString()
    }),
    returnData: (originalData) => {
        const {pages} = originalData as InfiniteData<NewslettersResponseType>;
        const newsletters = pages.flatMap(page => page.newsletters);
        const meta = pages[pages.length - 1].meta;

        return {
            newsletters: newsletters,
            meta,
            isEnd: meta ? meta.pagination.pages === meta.pagination.page : true
        };
    }
});

export const useReadNewsletter = createQueryWithId<NewslettersResponseType>({
    dataType,
    path: id => `/newsletters/${id}/`,
    defaultSearchParams: {include: 'count.active_members,count.posts'}
});

export const useAddNewsletter = createMutation<NewslettersResponseType, Partial<Newsletter> & {opt_in_existing: boolean}>({
    method: 'POST',
    path: () => '/newsletters/',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    body: ({opt_in_existing: _, ...newsletter}) => ({newsletters: [newsletter]}),
    searchParams: payload => ({opt_in_existing: payload.opt_in_existing.toString(), include: 'count.active_members,count.posts'}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: insertToQueryCache('newsletters')
    }
});

export interface NewslettersEditResponseType extends NewslettersResponseType {
    meta?: Meta & {sent_email_verification: string[]}
}

export interface NewslettersVerifyResponseType extends NewslettersResponseType {
    meta?: Meta & {email_verified: string}
}

export const useEditNewsletter = createMutation<NewslettersEditResponseType, Newsletter>({
    method: 'PUT',
    path: newsletter => `/newsletters/${newsletter.id}/`,
    body: newsletter => ({newsletters: [newsletter]}),
    defaultSearchParams: {include: 'count.active_members,count.posts'},
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: updateQueryCache('newsletters')
    }
});

export const useVerifyNewsletterEmail = createMutation<NewslettersVerifyResponseType, {token: string}>({
    method: 'PUT',
    path: () => '/newsletters/verifications/',
    body: ({token}) => ({token}),
    defaultSearchParams: {include: 'count.active_members,count.posts'},
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: updateQueryCache('newsletters')
    }
});
