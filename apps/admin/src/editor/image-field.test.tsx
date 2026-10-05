import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { deferred } from '@/utils/deferred';
import { ImageField } from './image-field';
import { type ImageFieldUpload, useImageFieldUpload } from './use-image-field-upload';

const mocks = vi.hoisted(() => ({
  upload:
    vi.fn<
      (payload: { file: File; onUploadProgress?: (percent: number) => void }) => Promise<unknown>
    >(),
}));

// The browser tier's fake API cannot report upload progress, so the transport is stood in for here.
vi.mock('@tryghost/admin-x-framework/api/images', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tryghost/admin-x-framework/api/images')>();
  const { useMutation } = await import('@tanstack/react-query');
  return { ...actual, useUploadImage: () => useMutation({ mutationFn: mocks.upload }) };
});

vi.mock('@/hooks/use-pintura-editor', () => ({
  usePinturaEditor: () => ({ isEnabled: false, isOpen: false, openEditor: vi.fn() }),
}));

vi.mock('@tryghost/admin-x-framework', () => ({
  useFramework: () => ({ unsplashConfig: null }),
}));

vi.mock('@tryghost/kg-unsplash-selector', () => ({ UnsplashSearchModal: () => null }));

function renderField() {
  const field: { upload?: ImageFieldUpload } = {};
  const onChange = vi.fn();

  function Harness() {
    field.upload = useImageFieldUpload('X image', onChange);
    return (
      <ImageField
        src={null}
        subject="X image"
        unsplashEnabled={false}
        upload={field.upload}
        onChange={onChange}
      />
    );
  }

  render(
    <QueryClientProvider client={new QueryClient()}>
      <Harness />
    </QueryClientProvider>,
  );
  return field as Required<typeof field>;
}

describe('ImageField upload progress', () => {
  it('fills the bar with the share of the image sent so far', async () => {
    const response = deferred<unknown>();
    let reportProgress: (percent: number) => void = () => {};
    mocks.upload.mockImplementation(({ onUploadProgress }) => {
      reportProgress = onUploadProgress ?? reportProgress;
      return response.promise;
    });
    const field = renderField();

    act(() => {
      void field.upload.onUpload(new File(['image'], 'hills.png', { type: 'image/png' }));
    });
    const bar = await screen.findByRole('progressbar', { name: 'Uploading X image' });
    expect(bar).toHaveAttribute('aria-valuenow', '0');

    act(() => reportProgress(42.6));

    expect(bar).toHaveAttribute('aria-valuenow', '43');
    expect(bar.firstElementChild).toHaveStyle({ width: '43%' });

    response.resolve({ images: [{ url: 'https://example.com/hills.png', ref: null }] });
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
  });
});
