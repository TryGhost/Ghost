import { waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NewslettersResponseSchema, useBrowseNewsletters } from '../../../src/api/newsletters';
import { renderHookWithProviders } from '../../../src/test/test-utils';
import { withMockFetch } from '../../utils/mock-fetch';

describe('newsletters api', () => {
  it('accepts the current Core newsletter response shape', () => {
    const result = NewslettersResponseSchema.parse({
      newsletters: [
        {
          id: 'newsletter-1',
          uuid: '0b71d5a2-bb5f-4d8d-8911-b4539d60e0f0',
          name: 'Weekly digest',
          description: null,
          feedback_enabled: false,
          slug: 'weekly-digest',
          sender_name: null,
          sender_email: null,
          sender_reply_to: 'newsletter',
          status: 'active',
          visibility: 'members',
          subscribe_on_signup: true,
          sort_order: 0,
          header_image: null,
          show_header_icon: true,
          show_header_title: true,
          title_font_category: 'sans_serif',
          title_font_weight: 'bold',
          title_alignment: 'center',
          show_excerpt: false,
          show_feature_image: true,
          body_font_category: 'sans_serif',
          footer_content: null,
          show_badge: true,
          show_header_name: true,
          show_post_title_section: true,
          show_comment_cta: true,
          show_share_button: false,
          show_subscription_details: false,
          show_latest_posts: false,
          background_color: 'light',
          header_background_color: 'transparent',
          button_color: 'accent',
          link_color: 'accent',
          post_title_color: null,
          section_title_color: null,
          divider_color: null,
          button_corners: 'rounded',
          button_style: 'fill',
          image_corners: 'square',
          link_style: 'underline',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    expect(result.newsletters[0].slug).toBe('weekly-digest');
  });

  it('rejects an invalid newsletters response', async () => {
    await withMockFetch(
      {
        json: {
          newsletters: null,
          users: [{ id: 'user-1', roles: [] }],
        },
        headers: { 'content-type': 'application/json' },
      },
      async () => {
        const { result } = renderHookWithProviders(() => useBrowseNewsletters());

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.data).toBeUndefined();
      },
    );
  });
});
