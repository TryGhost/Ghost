import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  SettingsModal,
  settingsModalVariants,
  type SettingsModalSize,
} from '@/components/patterns/settings-modal';

describe('SettingsModal', () => {
  it.each<SettingsModalSize>(['sm', 'md', 'lg', 'xl', 'full'])(
    'uses the standard dialog radius for the %s size',
    (size) => {
      expect(settingsModalVariants({ size })).toContain('rounded-lg');
    },
  );

  it('keeps the edge-to-edge bleed size square', () => {
    const size: SettingsModalSize = 'bleed';

    expect(settingsModalVariants({ size })).not.toContain('rounded-lg');
  });

  it('uses content-sized outline and primary actions by default', () => {
    render(
      <SettingsModal title="Test modal" onClose={() => undefined} onOk={() => undefined}>
        Modal content
      </SettingsModal>,
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    const okButton = screen.getByRole('button', { name: 'OK' });

    expect(cancelButton.className).toContain('border-control-border');
    expect(cancelButton.className).toContain('bg-transparent');
    expect(cancelButton.className).not.toContain('hover:bg-accent');
    expect(okButton.className).not.toContain('min-w-20');
  });

  it('closes through onClose', () => {
    const onClose = vi.fn();
    render(
      <SettingsModal title="Test modal" topRightContent="close" onClose={onClose}>
        Modal content
      </SettingsModal>,
    );

    fireEvent.click(screen.getByTestId('close-modal'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('confirms before closing through onClose when dirty', async () => {
    const onClose = vi.fn();
    render(
      <SettingsModal title="Test modal" topRightContent="close" dirty onClose={onClose}>
        Modal content
      </SettingsModal>,
    );

    fireEvent.click(screen.getByTestId('close-modal'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole('button', { name: 'Leave' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
