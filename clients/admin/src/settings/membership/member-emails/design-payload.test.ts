import { DEFAULT_EMAIL_DESIGN } from '@/settings/email-design/types';
import {
  buildAutomatedEmailDesignPayload,
  mapApiToDesignSettings,
} from '@/settings/membership/member-emails/design-payload';

describe('Welcome email design payload helpers', function () {
  it('does not hydrate immutable api metadata into design settings', function () {
    const apiData = {
      id: '1',
      slug: 'default-automated-email',
      created_at: '2026-04-02T00:00:00.000Z',
      updated_at: '2026-04-02T00:00:00.000Z',
      header_image: null,
      show_header_icon: true,
      show_header_title: true,
      show_badge: true,
      footer_content: null,
      ...DEFAULT_EMAIL_DESIGN,
    };

    const result = mapApiToDesignSettings(apiData) as unknown as typeof apiData;

    expect('id' in result).toBe(false);
    expect('slug' in result).toBe(false);
    expect('created_at' in result).toBe(false);
    expect('updated_at' in result).toBe(false);
    expect('header_image' in result).toBe(false);
    expect('show_header_icon' in result).toBe(false);
    expect('show_header_title' in result).toBe(false);
    expect('show_badge' in result).toBe(false);
    expect('footer_content' in result).toBe(false);
  });

  it('keeps only known welcome email design fields when mapping api data', function () {
    const apiData = {
      ...DEFAULT_EMAIL_DESIGN,
      custom_future_field: '#123456',
    };

    const result = mapApiToDesignSettings(apiData) as unknown as typeof apiData;

    expect('custom_future_field' in result).toBe(false);
  });

  it('keeps only known welcome email design fields in the save payload while excluding non-design metadata fields', function () {
    const state = {
      designSettings: {
        ...DEFAULT_EMAIL_DESIGN,
        id: '1',
        slug: 'default-automated-email',
        created_at: '2026-04-02T00:00:00.000Z',
        updated_at: '2026-04-02T00:00:00.000Z',
        custom_future_field: '#abcdef',
      } as unknown as typeof DEFAULT_EMAIL_DESIGN & {
        id: string;
        slug: string;
        created_at: string;
        updated_at: string;
        custom_future_field: string;
      },
      generalSettings: {
        senderName: 'Ghost',
        senderEmail: 'hello@example.com',
        replyToEmail: 'support@example.com',
        headerImage: '',
        showPublicationIcon: true,
        showPublicationTitle: true,
        showBadge: false,
        emailFooter: '',
      },
    };

    const payload = buildAutomatedEmailDesignPayload(state) as typeof state.designSettings & {
      header_image: string | null;
      show_header_icon: boolean;
      show_header_title: boolean;
      show_badge: boolean;
      footer_content: string | null;
    };

    expect('custom_future_field' in payload).toBe(false);
    expect('id' in payload).toBe(false);
    expect('slug' in payload).toBe(false);
    expect('created_at' in payload).toBe(false);
    expect('updated_at' in payload).toBe(false);
    expect(payload.show_header_icon).toBe(true);
  });
});
