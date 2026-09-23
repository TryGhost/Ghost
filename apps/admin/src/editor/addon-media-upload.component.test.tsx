import { expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { SettingsMediaUpload } from '@tryghost/addon-kit/host';
import { fakeAdminEndpoint, renderInApp } from '@test-utils/acceptance';

it.each([
  { label: 'Full audio', format: 'audio' as const, filename: 'episode.mp3', mime: 'audio/mpeg' },
  { label: 'Free audio', format: 'audio' as const, filename: 'preview.m4a', mime: 'audio/mp4' },
  { label: 'Full video', format: 'video' as const, filename: 'episode.mp4', mime: 'video/mp4' },
  { label: 'Free video', format: 'video' as const, filename: 'preview.webm', mime: 'video/webm' },
])('uploads $label through the host media API', async ({ label, format, filename, mime }) => {
  const url = `https://example.com/content/media/${filename}`;
  const upload = fakeAdminEndpoint('POST', '/media/upload/', { media: [{ url }] });
  const changed = vi.fn(async () => {});
  await renderInApp(<SettingsMediaUpload format={format} label={label} onChange={changed} />);
  await userEvent.upload(
    page.getByLabelText(label, { exact: true }).element(),
    new File(['media'], filename, { type: mime }),
  );
  await expect.poll(() => upload.requests.length).toBe(1);
  expect(upload.lastRequest?.body).toMatchObject({ file: { filename, type: mime } });
  await expect.poll(() => changed.mock.calls).toEqual([[{ url, mime_type: mime, byte_length: 5 }]]);
});

it('shows server upload limits without leaving the editor', async () => {
  fakeAdminEndpoint(
    'POST',
    '/media/upload/',
    {
      errors: [
        {
          message: 'Upload failed',
          context: 'Your plan supports files up to 100 MB.',
          type: 'HostLimitError',
        },
      ],
    },
    { status: 403 },
  );
  const changed = vi.fn(async () => {});
  await renderInApp(<SettingsMediaUpload label="Full audio" onChange={changed} />);
  await userEvent.upload(
    page.getByLabelText('Full audio', { exact: true }).element(),
    new File(['media'], 'episode.mp3', { type: 'audio/mpeg' }),
  );
  await expect.element(page.getByText('Your plan supports files up to 100 MB.')).toBeVisible();
  expect(changed).not.toHaveBeenCalled();
  await expect.element(page.getByRole('button', { name: 'Upload full audio' })).toBeEnabled();
});
