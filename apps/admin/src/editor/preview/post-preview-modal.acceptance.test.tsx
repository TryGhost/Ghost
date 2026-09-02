import { QueryClient } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ShadeApp } from '@tryghost/shade/app';
import {
  FrameworkProvider,
  defaultUnsplashConfig,
  type TopLevelFrameworkProps,
} from '@tryghost/admin-x-framework';

import '@/index.css';
import {
  configResponse,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeNewsletters,
  fakeTiers,
  newsletter,
  settingsResponse,
  tier,
  type Newsletter,
  type Tier,
} from '@test-utils/acceptance';
import { installBootOverrides } from '@test-utils/acceptance/boot';
import { PostPreviewModal } from '@/editor/preview/post-preview-modal';
import { previewScreen } from '@/editor/preview/preview.screen';

const POST_ID = 'abc123';
const PREVIEW_URL = 'http://localhost:2368/p/post-uuid/';
const CURRENT_USER_EMAIL = String(currentUserResponse().users[0].email);

interface RenderOptions {
  isPost?: boolean;
  newsletterSlug?: string;
  onBeforeOpen?: () => Promise<void>;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Renders the preview modal on its own — the editor header that opens it in
 * production is not built yet — inside the app's provider stack, against the
 * acceptance harness's fake Ghost API.
 */
async function renderPreviewModal({
  isPost = true,
  newsletterSlug,
  onBeforeOpen,
  onOpenChange = () => {},
}: RenderOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { refetchOnWindowFocus: false, retry: false, networkMode: 'always' },
    },
  });

  const framework: TopLevelFrameworkProps = {
    ghostVersion: '',
    externalNavigate: () => {},
    unsplashConfig: { ...defaultUnsplashConfig, Authorization: '' },
    sentryDSN: null,
    onUpdate: () => {},
    onInvalidate: () => {},
    onDelete: () => {},
    queryClient,
  };

  return await render(
    <StrictMode>
      <FrameworkProvider {...framework}>
        <ShadeApp className="shade-admin" darkMode={false}>
          <PostPreviewModal
            isPost={isPost}
            newsletterSlug={newsletterSlug}
            postId={POST_ID}
            previewUrl={PREVIEW_URL}
            open
            onBeforeOpen={onBeforeOpen}
            onOpenChange={onOpenChange}
          />
        </ShadeApp>
      </FrameworkProvider>
    </StrictMode>,
  );
}

function fakePreviewWorld({
  tiers = [],
  newsletters = [newsletter({ name: 'Weekly digest', slug: 'weekly-digest' })],
}: { tiers?: Tier[]; newsletters?: Newsletter[] } = {}) {
  fakeTiers(tiers);
  fakeNewsletters(newsletters);
}

function fakeEmailPreview(subject = 'Hello subject') {
  return fakeAdminEndpoint('GET', new RegExp(`^/email_previews/posts/${POST_ID}/`), {
    email_previews: [
      {
        html: '<html><head></head><body>Hello from the email</body></html>',
        plaintext: 'Hello from the email',
        subject,
      },
    ],
  });
}

function configWithMailgun() {
  const response = configResponse();
  response.config.mailgunIsConfigured = true;
  return response;
}

function fakeTestEmailSend() {
  return fakeAdminEndpoint('POST', new RegExp(`^/email_previews/posts/${POST_ID}/`), null, {
    status: 204,
  });
}

describe('Post preview modal', () => {
  it('previews the post in the browser as a free member', async () => {
    fakePreviewWorld();
    await renderPreviewModal();

    await expect.element(previewScreen.modal()).toBeVisible();
    await expect
      .element(previewScreen.browserFrame())
      .toHaveAttribute('src', `${PREVIEW_URL}?member_status=free`);
    await expect.element(previewScreen.browserChrome()).toHaveAttribute('data-device', 'desktop');
  });

  it('waits for the caller to save the post before previewing it', async () => {
    fakePreviewWorld();
    let releaseSave = () => {};
    const onBeforeOpen = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releaseSave = resolve;
        }),
    );
    await renderPreviewModal({ onBeforeOpen });

    await expect(previewScreen.browserFrame()).toHaveCount(0);
    expect(onBeforeOpen).toHaveBeenCalled();

    releaseSave();

    await expect.element(previewScreen.browserFrame()).toBeVisible();
  });

  it('closes the preview', async () => {
    fakePreviewWorld();
    const onOpenChange = vi.fn();
    await renderPreviewModal({ onOpenChange });

    await previewScreen.closeButton().click();

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('previews as a public visitor', async () => {
    fakePreviewWorld();
    await renderPreviewModal();

    await previewScreen.previewAs('Public visitor');

    await expect
      .element(previewScreen.browserFrame())
      .toHaveAttribute('src', `${PREVIEW_URL}?member_status=anonymous`);
  });

  it('previews as a member of a specific tier', async () => {
    fakePreviewWorld({ tiers: [tier({ name: 'Gold', slug: 'gold' })] });
    await renderPreviewModal();

    await previewScreen.previewAs('Specific tier');

    await expect.element(previewScreen.tierSelect()).toHaveTextContent('Gold');
    await expect
      .element(previewScreen.browserFrame())
      .toHaveAttribute('src', `${PREVIEW_URL}?member_status=paid&member_tier=gold`);
  });

  it('offers no tier audience without tiers', async () => {
    fakePreviewWorld();
    await renderPreviewModal();

    await previewScreen.segmentSelect().click();

    await expect.element(previewScreen.option('Paid member')).toBeVisible();
    await expect(previewScreen.option('Specific tier')).toHaveCount(0);
  });

  it('switches the frame to a mobile viewport', async () => {
    fakePreviewWorld();
    await renderPreviewModal();

    await previewScreen.mobileToggle().click();

    await expect.element(previewScreen.browserChrome()).toHaveAttribute('data-device', 'mobile');
    await expect.element(previewScreen.browserChrome()).toHaveClass('w-[380px]');
  });

  it('copies the preview link for the selected audience', async () => {
    fakePreviewWorld();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    await renderPreviewModal();

    await previewScreen.previewAs('Paid member');
    await previewScreen.copyLinkButton().click();

    await expect
      .poll(() => writeText.mock.calls.at(-1)?.[0])
      .toBe(`${PREVIEW_URL}?member_status=paid`);
    await expect
      .element(previewScreen.openInNewTabLink())
      .toHaveAttribute('href', `${PREVIEW_URL}?member_status=paid`);
  });

  it('previews the email for the selected audience', async () => {
    fakePreviewWorld({ tiers: [tier({ name: 'Gold', slug: 'gold' })] });
    const previewApi = fakeEmailPreview();
    await renderPreviewModal();

    await previewScreen.emailTab().click();

    await expect.element(previewScreen.emailSubject()).toHaveTextContent('Hello subject');
    await expect.element(previewScreen.emailFrom()).toHaveTextContent('Weekly digest');
    await expect.poll(() => previewApi.lastRequest?.url).toContain('member_status=free');
    await expect.poll(() => previewApi.lastRequest?.url).toContain('newsletter=weekly-digest');

    await previewScreen.previewAs('Specific tier');

    await expect.poll(() => previewApi.lastRequest?.url).toContain('member_status=paid');
    await expect.poll(() => previewApi.lastRequest?.url).toContain('member_tier=gold');
  });

  it('renders the email HTML in a sandboxed frame', async () => {
    fakePreviewWorld();
    fakeEmailPreview();
    await renderPreviewModal();

    await previewScreen.emailTab().click();

    const frame = previewScreen.emailFrame();
    await expect
      .element(frame)
      .toHaveAttribute('sandbox', 'allow-popups allow-popups-to-escape-sandbox');
    const srcdoc = () => frame.query()?.getAttribute('srcdoc');
    await expect.poll(srcdoc).toContain('Hello from the email');
    await expect.poll(srcdoc).toContain('scrollbar-width: thin');
  });

  it('previews the email for another newsletter', async () => {
    fakePreviewWorld({
      newsletters: [
        newsletter({ name: 'Weekly digest', slug: 'weekly-digest' }),
        newsletter({ name: 'Monthly roundup', slug: 'monthly-roundup' }),
      ],
    });
    const previewApi = fakeEmailPreview();
    await renderPreviewModal();

    await previewScreen.emailTab().click();
    await previewScreen.newsletterSelect().click();
    await previewScreen.option('Monthly roundup').click();

    await expect.poll(() => previewApi.lastRequest?.url).toContain('newsletter=monthly-roundup');
  });

  it('preselects the post’s own newsletter', async () => {
    fakePreviewWorld({
      newsletters: [
        newsletter({ name: 'Weekly digest', slug: 'weekly-digest' }),
        newsletter({ name: 'Monthly roundup', slug: 'monthly-roundup' }),
      ],
    });
    const previewApi = fakeEmailPreview();
    await renderPreviewModal({ newsletterSlug: 'monthly-roundup' });

    await previewScreen.emailTab().click();

    await expect.element(previewScreen.newsletterSelect()).toHaveTextContent('Monthly roundup');
    await expect.poll(() => previewApi.lastRequest?.url).toContain('newsletter=monthly-roundup');
  });

  it('sends a test email to the current user for the selected audience', async () => {
    installBootOverrides({ browseConfig: { response: configWithMailgun() } });
    fakePreviewWorld();
    fakeEmailPreview();
    const sendApi = fakeTestEmailSend();
    await renderPreviewModal();

    await previewScreen.emailTab().click();
    await previewScreen.testEmailButton().click();

    await expect.element(previewScreen.testEmailInput()).toHaveValue(CURRENT_USER_EMAIL);

    await previewScreen.sendTestEmailButton().click();

    await expect
      .poll(() => sendApi.lastRequest?.body)
      .toEqual({
        emails: [CURRENT_USER_EMAIL],
        newsletter: 'weekly-digest',
        member_status: 'free',
      });
  });

  it('sends a test email to another address', async () => {
    installBootOverrides({ browseConfig: { response: configWithMailgun() } });
    fakePreviewWorld();
    fakeEmailPreview();
    const sendApi = fakeTestEmailSend();
    await renderPreviewModal();

    await previewScreen.emailTab().click();
    await previewScreen.testEmailButton().click();
    await previewScreen.testEmailInput().fill('someone@example.com');
    await previewScreen.sendTestEmailButton().click();

    await expect
      .poll(() => sendApi.lastRequest?.body)
      .toMatchObject({
        emails: ['someone@example.com'],
      });
  });

  it('has no email preview when newsletters are disabled', async () => {
    installBootOverrides({
      browseSettings: {
        response: settingsResponse({ settings: { editor_default_email_recipients: 'disabled' } }),
      },
    });
    fakePreviewWorld();
    await renderPreviewModal();

    await expect.element(previewScreen.browserFrame()).toBeVisible();
    await expect(previewScreen.emailTab()).toHaveCount(0);
  });

  it('has no email preview for a page', async () => {
    fakePreviewWorld();
    await renderPreviewModal({ isPost: false });

    await expect.element(previewScreen.browserFrame()).toBeVisible();
    await expect(previewScreen.emailTab()).toHaveCount(0);
  });
});
