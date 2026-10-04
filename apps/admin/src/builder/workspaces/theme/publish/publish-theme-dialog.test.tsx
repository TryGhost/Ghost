import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PublishThemeDialog } from './publish-theme-dialog';
import type { PublishResult } from '@/builder/core/workspace';

describe('PublishThemeDialog', () => {
  it('lets a corrected revision publish after a nonretryable validation failure', async () => {
    const review = {
      revision: 'invalid',
      theme: { name: 'edition', builtIn: false },
      files: [],
      settings: [],
      totalFiles: 0,
      totalSettings: 0,
      pending: { text: false, settings: false },
    };
    const onPublish = vi
      .fn<() => Promise<PublishResult>>()
      .mockResolvedValueOnce({
        ok: false,
        revision: 'invalid',
        error: { code: 'gscan_invalid', message: 'Fix package.json', retryable: false },
      })
      .mockResolvedValueOnce({ ok: true, revision: 'corrected' });
    const onCloseReview = vi.fn();
    const failure = {
      status: 'failed' as const,
      stage: 'validation' as const,
      error: 'Fix package.json',
      retryable: false,
    };
    const { rerender } = render(
      <PublishThemeDialog
        builtIn={false}
        currentRevision="invalid"
        dirty={true}
        publishState={{ status: 'idle', stage: 'idle' }}
        review={review}
        sessionStatus="ready"
        themeName="edition"
        onCloseReview={onCloseReview}
        onOpenReview={vi.fn()}
        onPublish={onPublish}
      />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Publish changes' }).at(-1)!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Fix package.json');
    rerender(
      <PublishThemeDialog
        builtIn={false}
        currentRevision="invalid"
        dirty={true}
        publishState={failure}
        review={review}
        sessionStatus="ready"
        themeName="edition"
        onCloseReview={onCloseReview}
        onOpenReview={vi.fn()}
        onPublish={onPublish}
      />,
    );
    expect(screen.getByRole('button', { name: 'Close and fix theme' })).toBeInTheDocument();
    rerender(
      <PublishThemeDialog
        builtIn={false}
        currentRevision="corrected"
        dirty={true}
        publishState={failure}
        review={{ ...review, revision: 'corrected' }}
        sessionStatus="ready"
        themeName="edition"
        onCloseReview={onCloseReview}
        onOpenReview={vi.fn()}
        onPublish={onPublish}
      />,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Publish changes' }).at(-1)!);
    await waitFor(() => expect(onPublish).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onCloseReview).toHaveBeenCalledOnce());
  });

  it('shows a native-opened review and requires renewed review after its revision changes', () => {
    const onPublish = vi.fn();
    const onOpenReview = vi.fn();
    const review = {
      revision: 'reviewed',
      theme: { name: 'edition', builtIn: false },
      files: [{ path: 'index.hbs', change: 'modified' as const }],
      totalFiles: 1,
      settings: ['global.accent_color'],
      totalSettings: 1,
      pending: { text: true, settings: true },
    };
    const { rerender } = render(
      <PublishThemeDialog
        builtIn={false}
        currentRevision="reviewed"
        dirty={true}
        publishState={{ status: 'idle', stage: 'idle' }}
        review={review}
        sessionStatus="ready"
        themeName="edition"
        onOpenReview={onOpenReview}
        onPublish={onPublish}
      />,
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/index.hbs/)).toBeInTheDocument();
    expect(screen.getByText('Accent color')).toBeInTheDocument();
    expect(
      screen.getByText('Pending text and unapplied settings are excluded and will be kept.'),
    ).toBeInTheDocument();
    expect(onPublish).not.toHaveBeenCalled();
    rerender(
      <PublishThemeDialog
        builtIn={false}
        currentRevision="later"
        dirty={true}
        publishState={{ status: 'idle', stage: 'idle' }}
        review={review}
        sessionStatus="ready"
        themeName="edition"
        onOpenReview={onOpenReview}
        onPublish={onPublish}
      />,
    );
    expect(screen.getAllByRole('button', { name: 'Publish changes' }).at(-1)).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Review latest changes' }));
    expect(onOpenReview).toHaveBeenCalledOnce();
    expect(onPublish).not.toHaveBeenCalled();
  });

  it('validates and confirms a built-in theme copy explicitly', async () => {
    const onPublish = vi.fn(() => Promise.resolve({ ok: true as const, revision: 'published' }));
    render(
      <PublishThemeDialog
        builtIn={true}
        dirty={true}
        publishState={{ status: 'idle', stage: 'idle' }}
        sessionStatus="ready"
        themeName="source"
        onPublish={onPublish}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Publish changes' }));
    expect(screen.getByRole('heading', { name: 'Publish as a theme copy?' })).toBeInTheDocument();
    expect(screen.getByLabelText('Theme copy name')).toHaveValue('source-edited');

    fireEvent.change(screen.getByLabelText('Theme copy name'), { target: { value: 'source' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish and activate copy' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Built-in themes cannot be overwritten',
    );
    expect(onPublish).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Theme copy name'), { target: { value: 'My-Theme' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish and activate copy' }));

    await waitFor(() => expect(onPublish).toHaveBeenCalledWith('my-theme'));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('retains an editable-theme failure and offers a retry', async () => {
    const onPublish = vi.fn(() =>
      Promise.resolve({
        ok: false as const,
        revision: 'draft',
        error: {
          code: 'publish_settings_failed',
          message: 'Settings unavailable',
          retryable: true,
        },
      }),
    );
    const { rerender } = render(
      <PublishThemeDialog
        builtIn={false}
        dirty={true}
        publishState={{ status: 'idle', stage: 'idle' }}
        sessionStatus="ready"
        themeName="edition"
        onPublish={onPublish}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Publish changes' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Publish changes' }).at(-1)!);

    expect(await screen.findByRole('alert')).toHaveTextContent('Settings unavailable');
    rerender(
      <PublishThemeDialog
        builtIn={false}
        dirty={true}
        publishState={{
          status: 'failed',
          stage: 'settings',
          targetName: 'edition',
          error: 'Settings unavailable',
        }}
        sessionStatus="ready"
        themeName="edition"
        onPublish={onPublish}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry publish' }));

    expect(onPublish).toHaveBeenCalledTimes(2);
  });

  it('disables publishing without changes or while another operation is active', () => {
    const { rerender } = render(
      <PublishThemeDialog
        builtIn={false}
        dirty={false}
        publishState={{ status: 'idle', stage: 'idle' }}
        sessionStatus="ready"
        themeName="edition"
        onPublish={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Publish changes' })).toBeDisabled();

    rerender(
      <PublishThemeDialog
        builtIn={false}
        dirty={true}
        publishState={{ status: 'idle', stage: 'idle' }}
        sessionStatus="running"
        themeName="edition"
        onPublish={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Publish changes' })).toBeDisabled();
  });

  it('does not mark a valid copy name invalid for publish failures and closes non-retryable failures for editing', async () => {
    const onPublish = vi.fn(() =>
      Promise.resolve({
        ok: false as const,
        revision: 'draft',
        error: {
          code: 'publish_conflict',
          message: 'The installed theme changed.',
          retryable: false,
        },
      }),
    );
    const { rerender } = render(
      <PublishThemeDialog
        builtIn={true}
        dirty={true}
        publishState={{ status: 'idle', stage: 'idle' }}
        sessionStatus="ready"
        themeName="source"
        onPublish={onPublish}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Publish changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish and activate copy' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The installed theme changed.');
    expect(screen.getByLabelText('Theme copy name')).toHaveAttribute('aria-invalid', 'false');

    rerender(
      <PublishThemeDialog
        builtIn={true}
        dirty={true}
        publishState={{
          status: 'failed',
          stage: 'validation',
          error: 'The installed theme changed.',
          retryable: false,
        }}
        sessionStatus="ready"
        themeName="source"
        onPublish={onPublish}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close and fix theme' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(onPublish).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Publish changes' }));
    expect(screen.getByRole('button', { name: 'Publish and activate copy' })).toBeInTheDocument();
  });

  it('locks an uploaded copy name while retrying activation', async () => {
    const onPublish = vi.fn(() =>
      Promise.resolve({
        ok: false as const,
        revision: 'draft',
        error: {
          code: 'publish_activation_failed',
          message: 'Activation unavailable',
          retryable: true,
        },
      }),
    );
    const { rerender } = render(
      <PublishThemeDialog
        builtIn={true}
        dirty={true}
        publishState={{ status: 'idle', stage: 'idle' }}
        sessionStatus="ready"
        themeName="source"
        onPublish={onPublish}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Publish changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish and activate copy' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Activation unavailable');

    rerender(
      <PublishThemeDialog
        builtIn={true}
        dirty={true}
        publishState={{
          status: 'failed',
          stage: 'activation',
          error: 'Activation unavailable',
          retryable: true,
        }}
        sessionStatus="ready"
        themeName="source"
        onPublish={onPublish}
      />,
    );
    expect(screen.getByLabelText('Theme copy name')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry publish' }));
    expect(onPublish).toHaveBeenLastCalledWith('source-edited');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish changes' }));
    expect(screen.getByLabelText('Theme copy name')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Retry publish' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Activation unavailable');
  });

  it('keeps an uploaded copy name locked after a non-retryable settings failure', () => {
    render(
      <PublishThemeDialog
        builtIn={true}
        dirty={true}
        publishState={{
          status: 'failed',
          stage: 'settings',
          error: 'The setting is invalid',
          retryable: false,
        }}
        sessionStatus="ready"
        themeName="source"
        onPublish={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Publish changes' }));

    expect(screen.getByLabelText('Theme copy name')).toBeDisabled();
  });
});
