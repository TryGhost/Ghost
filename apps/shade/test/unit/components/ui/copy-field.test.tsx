import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import {
  CopyField,
  CopyFieldActions,
  CopyFieldContent,
  CopyFieldCopyButton,
  CopyFieldLabel,
  CopyFieldValue,
} from '../../../../src/components/ui/copy-field';
import { render } from '../../utils/test-utils';

describe('CopyField Components', () => {
  it('uses standard field label typography', () => {
    render(
      <CopyField value="https://example.com">
        <CopyFieldLabel data-testid="copy-field-label">Shareable link</CopyFieldLabel>
      </CopyField>,
    );

    const label = screen.getByTestId('copy-field-label');

    expect(label.className).toMatch(/text-control!/);
    expect(label.className).toMatch(/font-medium/);
    expect(label.className).toMatch(/leading-snug/);
    expect(label.className).not.toMatch(/font-semibold/);
  });

  it('associates its read-only value with its label', () => {
    render(
      <CopyField value="https://example.com">
        <CopyFieldLabel>Shareable link</CopyFieldLabel>
        <CopyFieldContent>
          <CopyFieldValue />
        </CopyFieldContent>
      </CopyField>,
    );

    const value = screen.getByRole('textbox', { name: 'Shareable link' });

    expect(value.textContent).toBe('https://example.com');
    expect(value.getAttribute('aria-readonly')).toBe('true');
    expect(value.getAttribute('tabindex')).toBe('0');
  });

  it('copies the value and shows clipboard feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(
      <CopyField value="https://example.com">
        <CopyFieldContent>
          <CopyFieldValue />
          <CopyFieldActions>
            <CopyFieldCopyButton copiedLabel="Copied">Copy</CopyFieldCopyButton>
          </CopyFieldActions>
        </CopyFieldContent>
      </CopyField>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() => {
      expect(writeText.mock.calls.length).toBe(1);
      expect(writeText.mock.calls[0]?.[0]).toBe('https://example.com');
      expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
    });
  });

  it('disables its copy action', () => {
    render(
      <CopyField value="https://example.com" disabled>
        <CopyFieldContent>
          <CopyFieldValue />
          <CopyFieldActions>
            <CopyFieldCopyButton />
          </CopyFieldActions>
        </CopyFieldContent>
      </CopyField>,
    );

    expect(screen.getByRole('button', { name: 'Copy' }).hasAttribute('disabled')).toBeTruthy();
  });
});
