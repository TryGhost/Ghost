import assert from 'assert/strict';
import { describe, it, vi } from 'vitest';
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

    assert.match(label.className, /text-control!/);
    assert.match(label.className, /font-medium/);
    assert.match(label.className, /leading-snug/);
    assert.doesNotMatch(label.className, /font-semibold/);
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

    assert.equal(value.textContent, 'https://example.com');
    assert.equal(value.getAttribute('aria-readonly'), 'true');
    assert.equal(value.getAttribute('tabindex'), '0');
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
      assert.equal(writeText.mock.calls.length, 1);
      assert.equal(writeText.mock.calls[0]?.[0], 'https://example.com');
      assert.ok(screen.getByRole('button', { name: 'Copied' }));
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

    assert.ok(screen.getByRole('button', { name: 'Copy' }).hasAttribute('disabled'));
  });
});
