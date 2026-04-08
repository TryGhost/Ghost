import assert from 'assert/strict';
import {act, fireEvent, screen} from '@testing-library/react';
import {beforeAll, describe, it, vi} from 'vitest';
import SemanticColorPickerField from '../../../../src/components/features/color-picker/semantic-color-picker-field';
import {render} from '../../utils/test-utils';

describe('SemanticColorPickerField', () => {
    beforeAll(() => {
        // Radix Slider uses ResizeObserver internally — not available in jsdom
        /* eslint-disable no-undef */
        global.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        } as unknown as typeof ResizeObserver;
        /* eslint-enable no-undef */
    });

    it('renders selected swatch outline and transparent slash indicator', () => {
        render(
            <SemanticColorPickerField
                swatches={[
                    {
                        hex: '#00000000',
                        title: 'Transparent',
                        value: 'transparent'
                    }
                ]}
                title="Header background color"
                value="transparent"
            />
        );

        fireEvent.click(screen.getByText('Header background color'));
        const transparentSwatch = screen.getByRole('button', {name: 'Transparent'});
        const pickerTrigger = screen.getByRole('button', {name: 'Pick color'});

        assert.ok(transparentSwatch.className.includes('outline'));
        assert.ok(transparentSwatch.querySelector('[data-testid="transparent-indicator"]'));
        assert.equal(pickerTrigger.querySelector('[data-testid="transparent-indicator"]'), null);
    });

    it('emits semantic swatch values when swatches are clicked', () => {
        const onChange = vi.fn();
        render(
            <SemanticColorPickerField
                onChange={onChange}
                swatches={[
                    {
                        hex: '#ff0088',
                        title: 'Accent',
                        value: 'accent'
                    },
                    {
                        hex: '#ffffff',
                        title: 'Auto',
                        value: null
                    }
                ]}
                title="Button color"
                value="#123456"
            />
        );

        fireEvent.click(screen.getByText('Button color'));
        fireEvent.click(screen.getByRole('button', {name: 'Accent'}));
        assert.equal(onChange.mock.calls[onChange.mock.calls.length - 1][0], 'accent');

        fireEvent.click(screen.getByText('Button color'));
        fireEvent.click(screen.getByRole('button', {name: 'Auto'}));
        assert.equal(onChange.mock.calls[onChange.mock.calls.length - 1][0], null);
    });

    it('does not emit onChange when opened with transparent value', async () => {
        const onChange = vi.fn();
        render(
            <SemanticColorPickerField
                onChange={onChange}
                swatches={[
                    {
                        hex: '#00000000',
                        title: 'Transparent',
                        value: 'transparent'
                    }
                ]}
                title="Header background color"
                value="transparent"
            />
        );

        await act(async () => {
            fireEvent.click(screen.getByText('Header background color'));
            await Promise.resolve();
            await new Promise((resolve) => {
                setTimeout(resolve, 0);
            });
        });

        assert.equal(onChange.mock.calls.length, 0);
    });

    it('emits hex changes after picker interaction', () => {
        const onChange = vi.fn();
        render(
            <SemanticColorPickerField
                onChange={onChange}
                swatches={[
                    {
                        hex: '#ff0088',
                        title: 'Accent',
                        value: 'accent'
                    }
                ]}
                title="Link color"
                value="accent"
            />
        );

        fireEvent.click(screen.getByText('Link color'));
        const hexInput = screen.getByRole('textbox');
        fireEvent.pointerDown(hexInput);
        fireEvent.input(hexInput, {target: {value: '#123456'}});
        fireEvent.change(hexInput, {target: {value: '#123456'}});

        assert.equal(onChange.mock.calls.some(call => call[0]?.toLowerCase() === '#123456'), true);
    });
});
