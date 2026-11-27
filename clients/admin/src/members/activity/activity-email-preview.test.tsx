import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import ActivityEmailPreview from './activity-email-preview';
import {
  activityEmailPreviewData,
  activityPreviewDocument,
  activitySenderAddress,
} from './activity-email-preview-data';

const queries = vi.hoisted(() => ({
  preview: vi.fn(),
  newsletters: vi.fn(),
  config: vi.fn(),
  settings: vi.fn(),
  retry: vi.fn(),
}));

vi.mock('@tryghost/admin-x-framework/api/email-previews', () => ({
  useEmailPreview: queries.preview,
}));
vi.mock('@tryghost/admin-x-framework/api/newsletters', () => ({
  useBrowseNewsletters: queries.newsletters,
}));
vi.mock('@tryghost/admin-x-framework/api/config', () => ({ useBrowseConfig: queries.config }));
vi.mock('@tryghost/admin-x-framework/api/settings', async () => ({
  ...(await vi.importActual<typeof import('@tryghost/admin-x-framework/api/settings')>(
    '@tryghost/admin-x-framework/api/settings',
  )),
  useBrowseSettings: queries.settings,
}));

const savedEmail = {
  html: '<p>Saved body</p><a href="https://example.com" target="_blank">A link</a>',
  subject: 'Original subject',
  post_id: 'post-1',
};

beforeEach(() => {
  vi.clearAllMocks();
  queries.preview.mockReturnValue({ isLoading: false, isError: false, refetch: queries.retry });
  queries.newsletters.mockReturnValue({
    data: { newsletters: [{ sender_name: 'Newsletter', sender_email: 'news@example.com' }] },
  });
  queries.config.mockReturnValue({ data: { config: {} } });
  queries.settings.mockReturnValue({
    data: {
      settings: [
        { key: 'title', value: 'Publication' },
        { key: 'default_email_address', value: 'default@example.com' },
      ],
    },
  });
});

describe('Activity email preview', () => {
  it('uses stored HTML and subject without generating a new preview, and disables navigation', () => {
    render(<ActivityEmailPreview email={savedEmail} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Email preview' })).toBeTruthy();
    expect(screen.getByText('Original subject', { exact: false })).toBeTruthy();
    expect(screen.getByText('Newsletter <news@example.com>', { exact: false })).toBeTruthy();
    expect(screen.getByText('Jamie Larson <jamie@example.com>', { exact: false })).toBeTruthy();
    const frame = screen.getByTitle('Email content');
    expect(frame.getAttribute('sandbox')).toBe('');
    expect(frame.getAttribute('srcdoc')).toContain('Saved body');
    expect(frame.getAttribute('srcdoc')).not.toContain('href=');
    expect(queries.preview).toHaveBeenCalledWith('post-1', { enabled: false });
    fireEvent.click(screen.getByRole('radio', { name: 'Mobile' }));
    expect(
      screen.getByTitle('Email content').closest('[data-device]')?.getAttribute('data-device'),
    ).toBe('mobile');
  });

  it('supports keyboard dismissal and the close button', () => {
    const onClose = vi.fn();
    render(<ActivityEmailPreview email={savedEmail} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('returns focus to the activity link after closing', async () => {
    function ActivityLink() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Preview saved email
          </button>
          {open && <ActivityEmailPreview email={savedEmail} onClose={() => setOpen(false)} />}
        </>
      );
    }
    render(<ActivityLink />);
    const opener = screen.getByRole('button', { name: 'Preview saved email' });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(window.document.activeElement).toBe(opener));
  });

  it('loads a missing historical body using the post id and offers retry after a failed request', () => {
    queries.preview.mockReturnValue({ isLoading: true });
    const { rerender } = render(
      <ActivityEmailPreview email={{ post_id: 'post-1' }} onClose={vi.fn()} />,
    );
    expect(queries.preview).toHaveBeenCalledWith('post-1', { enabled: true });
    expect(screen.queryByTitle('Email content')).toBeNull();
    queries.preview.mockReturnValue({ isLoading: false, isError: true, refetch: queries.retry });
    rerender(<ActivityEmailPreview email={{ post_id: 'post-1' }} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(queries.retry).toHaveBeenCalledOnce();
    queries.preview.mockReturnValue({
      data: { email_previews: [{ html: '<p>Fallback</p>', subject: 'Rendered subject' }] },
    });
    rerender(<ActivityEmailPreview email={{ post_id: 'post-1' }} onClose={vi.fn()} />);
    expect(screen.getByTitle('Email content').getAttribute('srcdoc')).toContain('Fallback');
    expect(screen.getByText('Rendered subject', { exact: false })).toBeTruthy();
  });

  it('does not interpret a deleted email or automated email id as a post id', () => {
    render(
      <ActivityEmailPreview email={{ id: 'automated-1', subject: 'Welcome' }} onClose={vi.fn()} />,
    );
    expect(queries.preview).toHaveBeenCalledWith('', { enabled: false });
    expect(screen.getByText('The original email content is no longer available.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('keeps the historical body visible and allows retry when sender details fail', () => {
    queries.settings.mockReturnValue({ isError: true, refetch: queries.retry });
    queries.config.mockReturnValue({ refetch: queries.retry });
    queries.newsletters.mockReturnValue({ refetch: queries.retry });
    render(<ActivityEmailPreview email={savedEmail} onClose={vi.fn()} />);
    expect(screen.getByTitle('Email content').getAttribute('srcdoc')).toContain('Saved body');
    expect(screen.getByRole('alert').textContent).toBe('Couldn’t load sender details.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry sender details' }));
    expect(queries.retry).toHaveBeenCalledTimes(3);
  });
});

describe('Activity email data', () => {
  it('accepts nested stored emails with an empty subject and does not require a style tag or doctype', () => {
    expect(
      activityEmailPreviewData({ email: { html: '<p>Original</p>', subject: '' } }).stored,
    ).toEqual({ html: '<p>Original</p>', subject: '' });
    expect(activityEmailPreviewData({ id: 'post-2', title: 'A post' }).postId).toBe('post-2');
    expect(activityPreviewDocument('<p>Original</p>')).toContain('<p>Original</p>');
  });

  it('neutralizes refresh redirects, bases, form submission and image-map links', () => {
    const html = activityPreviewDocument(
      '<base href="https://example.com"><meta http-equiv="refresh" content="0;url=https://example.com"><form action="https://example.com"><button>Send</button></form><map><area href="https://example.com"></map>',
    );
    expect(html).not.toMatch(/<base|http-equiv|<form|href=/);
  });

  it('preserves managed sender restrictions and falls back to the default address', () => {
    expect(
      activitySenderAddress('other@example.com', 'default@managed.com', {
        hostSettings: { managedEmail: { enabled: true } },
      }),
    ).toBe('default@managed.com');
    expect(
      activitySenderAddress('other@example.com', 'default@managed.com', {
        hostSettings: { managedEmail: { enabled: true, sendingDomain: 'managed.com' } },
      }),
    ).toBe('default@managed.com');
    expect(
      activitySenderAddress('news@managed.com', 'default@managed.com', {
        hostSettings: { managedEmail: { enabled: true, sendingDomain: 'managed.com' } },
      }),
    ).toBe('news@managed.com');
  });
});
