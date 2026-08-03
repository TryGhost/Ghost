import assert from 'assert/strict';
import {describe, it, vi} from 'vitest';
import {fireEvent, screen, waitFor} from '@testing-library/react';

import {Button} from '../../../../src/components/ui/button';
import {
    CopyField,
    CopyFieldActions,
    CopyFieldContent,
    CopyFieldCopyButton,
    CopyFieldLabel,
    CopyFieldValue
} from '../../../../src/components/ui/copy-field';
import {render} from '../../utils/test-utils';

describe('CopyField Components', () => {
    it('uses standard field label typography', () => {
        render(
            <CopyField value='https://example.com'>
                <CopyFieldLabel data-testid='copy-field-label'>Shareable link</CopyFieldLabel>
            </CopyField>
        );

        const label = screen.getByTestId('copy-field-label');

        assert.match(label.className, /text-control!/);
        assert.match(label.className, /font-medium/);
        assert.match(label.className, /leading-snug/);
        assert.doesNotMatch(label.className, /font-semibold/);
    });

    it('uses the standard input surface and shared control height', () => {
        render(
            <CopyField value='https://example.com'>
                <CopyFieldContent data-testid='copy-field-content'>
                    <CopyFieldValue data-testid='copy-field-value' />
                </CopyFieldContent>
            </CopyField>
        );

        const content = screen.getByTestId('copy-field-content');
        const value = screen.getByTestId('copy-field-value');

        assert.match(content.className, /border-control-border/);
        assert.match(content.className, /bg-control-readonly-surface/);
        assert.match(content.className, /rounded-md/);
        assert.match(content.className, /h-\(--control-height\)/);
        assert.doesNotMatch(content.className, /border-b/);
        assert.match(value.className, /text-muted-foreground/);
    });

    it('associates its read-only value with its label', () => {
        render(
            <CopyField value='https://example.com'>
                <CopyFieldLabel>Shareable link</CopyFieldLabel>
                <CopyFieldContent>
                    <CopyFieldValue />
                </CopyFieldContent>
            </CopyField>
        );

        const value = screen.getByRole('textbox', {name: 'Shareable link'});

        assert.equal(value.textContent, 'https://example.com');
        assert.equal(value.getAttribute('aria-readonly'), 'true');
        assert.equal(value.getAttribute('tabindex'), '0');
    });

    it('insets its actions by one pixel and uses compact button radii', () => {
        render(
            <CopyField value='https://example.com'>
                <CopyFieldContent>
                    <CopyFieldValue />
                    <CopyFieldActions data-testid='copy-field-actions'>
                        <Button data-testid='secondary-action' size='sm' variant='ghost'>Preview</Button>
                        <CopyFieldCopyButton data-testid='copy-action' />
                    </CopyFieldActions>
                </CopyFieldContent>
            </CopyField>
        );

        const actions = screen.getByTestId('copy-field-actions');

        assert.match(actions.className, /right-\[1px\]/);
        assert.match(actions.className, /gap-px/);
        assert.match(actions.className, /\[&_button\]:h-7/);
        assert.match(actions.className, /\[&_button\]:rounded-sm/);
        assert.match(actions.className, /\[&_button:not\(\[data-slot=copy-field-copy-button\]\)\]:bg-control-readonly-surface/);
        assert.match(actions.className, /\[&_button:not\(\[data-slot=copy-field-copy-button\]\)\]:hover:bg-secondary/);
        assert.match(actions.className, /bg-control-readonly-surface/);
        assert.doesNotMatch(actions.className, /\[&_button\]:bg-surface-elevated/);
        assert.match(screen.getByTestId('copy-action').className, /border-control-border/);
        assert.match(screen.getByTestId('copy-action').className, /hover:border-border-strong\/40/);
        assert.match(screen.getByTestId('copy-action').className, /bg-surface-elevated/);
        assert.match(screen.getByTestId('copy-action').className, /hover:bg-surface-elevated/);
        assert.equal(screen.getByTestId('copy-action').getAttribute('data-slot'), 'copy-field-copy-button');
        assert.match(screen.getByTestId('secondary-action').className, /hover:bg-accent/);
        assert.doesNotMatch(screen.getByTestId('secondary-action').className, /bg-surface-elevated/);
    });

    it('copies the value and shows clipboard feedback', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {writeText}
        });

        render(
            <CopyField value='https://example.com'>
                <CopyFieldContent>
                    <CopyFieldValue />
                    <CopyFieldActions>
                        <CopyFieldCopyButton copiedLabel='Copied'>Copy</CopyFieldCopyButton>
                    </CopyFieldActions>
                </CopyFieldContent>
            </CopyField>
        );

        fireEvent.click(screen.getByRole('button', {name: 'Copy'}));

        await waitFor(() => {
            assert.equal(writeText.mock.calls.length, 1);
            assert.equal(writeText.mock.calls[0]?.[0], 'https://example.com');
            assert.ok(screen.getByRole('button', {name: 'Copied'}));
        });
    });

    it('disables its copy action', () => {
        render(
            <CopyField value='https://example.com' disabled>
                <CopyFieldContent>
                    <CopyFieldValue />
                    <CopyFieldActions>
                        <CopyFieldCopyButton />
                    </CopyFieldActions>
                </CopyFieldContent>
            </CopyField>
        );

        assert.ok(screen.getByRole('button', {name: 'Copy'}).hasAttribute('disabled'));
    });
});
