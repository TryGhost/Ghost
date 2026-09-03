import { InfiniteData } from '@tanstack/react-query';
import { Meta, createInfiniteQuery, createMutation } from '../utils/api/hooks';
import { insertToQueryCache, updateQueryCache } from '../utils/api/update-queries';
import { z } from 'zod';

export const NewsletterSchema = z.object({
  id: z.string(),
  uuid: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  feedback_enabled: z.boolean(),
  slug: z.string(),
  sender_name: z.string().nullable(),
  sender_email: z.string().nullable(),
  sender_reply_to: z.string(),
  status: z.string(),
  visibility: z.string(),
  subscribe_on_signup: z.boolean(),
  sort_order: z.number(),
  header_image: z.string().nullable(),
  show_header_icon: z.boolean(),
  show_header_title: z.boolean(),
  title_font_category: z.string(),
  title_font_weight: z.string(),
  title_alignment: z.string(),
  show_excerpt: z.boolean(),
  show_feature_image: z.boolean(),
  body_font_category: z.string(),
  footer_content: z.string().nullable(),
  show_badge: z.boolean(),
  show_header_name: z.boolean(),
  show_post_title_section: z.boolean(),
  show_comment_cta: z.boolean(),
  show_share_button: z.boolean(),
  show_subscription_details: z.boolean(),
  show_latest_posts: z.boolean(),
  background_color: z.string(),
  header_background_color: z.string(),
  button_color: z.string().nullable(),
  link_color: z.string().nullable(),
  post_title_color: z.string().nullable(),
  section_title_color: z.string().nullable(),
  divider_color: z.string().nullable(),
  button_corners: z.string().nullable(),
  button_style: z.string().nullable(),
  image_corners: z.string().nullable(),
  link_style: z.string().nullable(),
  // Older and current Core versions may omit this design setting.
  divider_style: z.string().nullish(),
  created_at: z.string(),
  updated_at: z.string(),
  count: z
    .object({
      posts: z.number().optional(),
      active_members: z.number().optional(),
    })
    .optional(),
});

const NewslettersMetaSchema = z.object({
  capabilities: z
    .object({
      dislikes: z.boolean().optional(),
    })
    .optional(),
  pagination: z.object({
    page: z.number(),
    limit: z.union([z.number(), z.literal('all')]),
    pages: z.number(),
    total: z.number(),
    next: z.number().nullable(),
    prev: z.number().nullable(),
  }),
});

export const NewslettersResponseSchema = z.object({
  meta: NewslettersMetaSchema.optional(),
  newsletters: z.array(NewsletterSchema),
});

export type Newsletter = z.infer<typeof NewsletterSchema>;
export type NewslettersResponseType = z.infer<typeof NewslettersResponseSchema>;

const dataType = 'NewslettersResponseType';
export const newslettersDataType = dataType;

export const useBrowseNewsletters = createInfiniteQuery<
  NewslettersResponseType & { isEnd: boolean },
  NewslettersResponseType
>({
  dataType,
  path: '/newsletters/',
  parseResponse: (data) => NewslettersResponseSchema.parse(data),
  defaultSearchParams: { include: 'count.active_members,count.posts', limit: '50' },
  defaultNextPageParams: (lastPage, otherParams) => ({
    ...otherParams,
    page: (lastPage.meta?.pagination.next || 1).toString(),
  }),
  returnData: (originalData) => {
    const { pages } = originalData as InfiniteData<NewslettersResponseType>;
    const newsletters = pages.flatMap((page) => page.newsletters);
    const meta = pages[pages.length - 1].meta;

    return {
      newsletters: newsletters,
      meta,
      isEnd: meta ? meta.pagination.pages === meta.pagination.page : true,
    };
  },
});

export const useAddNewsletter = createMutation<
  NewslettersResponseType,
  Partial<Newsletter> & { opt_in_existing: boolean }
>({
  method: 'POST',
  path: () => '/newsletters/',
  body: ({ opt_in_existing: _, ...newsletter }) => ({ newsletters: [newsletter] }),
  searchParams: (payload) => ({
    opt_in_existing: payload.opt_in_existing.toString(),
    include: 'count.active_members,count.posts',
  }),
  updateQueries: {
    dataType,
    emberUpdateType: 'createOrUpdate',
    update: insertToQueryCache('newsletters'),
  },
});

export interface NewslettersEditResponseType extends NewslettersResponseType {
  meta?: Meta & { sent_email_verification: string[] };
}

export interface NewslettersVerifyResponseType extends NewslettersResponseType {
  meta?: Meta & { email_verified: string };
}

export const useEditNewsletter = createMutation<NewslettersEditResponseType, Newsletter>({
  method: 'PUT',
  path: (newsletter) => `/newsletters/${newsletter.id}/`,
  body: (newsletter) => ({ newsletters: [newsletter] }),
  defaultSearchParams: { include: 'count.active_members,count.posts' },
  updateQueries: {
    dataType,
    emberUpdateType: 'createOrUpdate',
    update: updateQueryCache('newsletters'),
  },
});

export const useVerifyNewsletterEmail = createMutation<
  NewslettersVerifyResponseType,
  { token: string }
>({
  method: 'PUT',
  path: () => '/newsletters/verifications/',
  body: ({ token }) => ({ token }),
  defaultSearchParams: { include: 'count.active_members,count.posts' },
  updateQueries: {
    dataType,
    emberUpdateType: 'createOrUpdate',
    update: updateQueryCache('newsletters'),
  },
});
