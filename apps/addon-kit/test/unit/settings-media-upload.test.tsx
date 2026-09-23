import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SettingsMediaUpload } from '../../src/host/settings-media-upload.tsx';
const { upload } = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock('@tryghost/admin-x-framework/hooks', () => ({
  useKoenigFileUpload: () => ({ upload, progress: 50, isLoading: false, errors: [] }),
}));
afterEach(cleanup);
it('discards uploads that finish after their card editing surface is disposed', async () => {
  let complete!: (value: { url: string }[]) => void;
  upload.mockReturnValue(
    new Promise((resolve) => {
      complete = resolve;
    }),
  );
  const onChange = vi.fn();
  const view = render(<SettingsMediaUpload label="Full audio" onChange={onChange} />);
  fireEvent.change(view.getByLabelText('Full audio'), {
    target: { files: [new File(['audio'], 'episode.mp3')] },
  });
  view.unmount();
  await act(async () => {
    complete([{ url: 'https://site.test/episode.mp3' }]);
  });
  expect(onChange).not.toHaveBeenCalled();
});
it('uploads bytes in the host and sends only a media reference to the app', async () => {
  const onChange = vi.fn();
  upload.mockResolvedValue([{ url: 'https://site.test/episode.mp3' }]);
  const view = render(<SettingsMediaUpload label="Full audio" onChange={onChange} />);
  const file = new File(['audio'], 'episode.mp3', { type: 'audio/mpeg' });
  await act(async () => {
    fireEvent.change(view.getByLabelText('Full audio'), { target: { files: [file] } });
  });
  expect(upload).toHaveBeenLastCalledWith([file], { throwOnError: true });
  expect(onChange).toHaveBeenCalledWith({
    url: 'https://site.test/episode.mp3',
    mime_type: 'audio/mpeg',
    byte_length: 5,
  });
});
it('shows the actionable upload failure returned by the host', async () => {
  upload.mockRejectedValue({
    message: 'Upload failed',
    context: 'Your plan supports files up to 100 MB.',
  });
  const view = render(<SettingsMediaUpload label="Full audio" />);
  await act(async () => {
    fireEvent.change(view.getByLabelText('Full audio'), {
      target: { files: [new File(['audio'], 'episode.mp3')] },
    });
  });
  expect(view.getByText('Your plan supports files up to 100 MB.')).toBeTruthy();
});
