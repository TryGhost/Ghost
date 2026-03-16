import assert from 'assert/strict';
import {beforeAll, describe, it, vi} from 'vitest';
import {fireEvent, screen} from '@testing-library/react';
import ColorPicker, {
    ColorPickerFormat,
    ColorPickerRoot,
    ColorPickerSelection
} from '../../../../src/components/features/color-picker/color-picker';
import {render} from '../../utils/test-utils';

describe('ColorPicker Component', () => {
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

    describe('initial color', () => {
        function renderWithColor(defaultValue: string) {
            const handleChange = vi.fn();
            render(<ColorPicker defaultValue={defaultValue} onChange={handleChange} />);
            const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1];
            return lastCall[0].toUpperCase();
        }

        // Regression: zero-value HSL components (e.g. lightness=0 for black)
        // were treated as falsy, causing the picker to fall back to defaults
        it('reflects black (#000000)', () => {
            assert.equal(renderWithColor('#000000'), '#000000');
        });

        it('reflects grey (#808080)', () => {
            assert.equal(renderWithColor('#808080'), '#808080');
        });
    });

    describe('gradient selection', () => {
        function renderGradient(defaultValue = '#FF0000') {
            const handleChange = vi.fn();
            render(
                <ColorPickerRoot defaultValue={defaultValue} onChange={handleChange}>
                    <ColorPickerSelection data-testid="gradient" />
                </ColorPickerRoot>
            );

            const gradient = screen.getByTestId('gradient');
            vi.spyOn(gradient, 'getBoundingClientRect').mockReturnValue({
                left: 0,
                top: 0,
                width: 200,
                height: 200,
                right: 200,
                bottom: 200,
                x: 0,
                y: 0,
                toJSON: () => {}
            });

            return {gradient, handleChange};
        }

        it('updates color on single click without dragging', () => {
            const {gradient, handleChange} = renderGradient();
            const callsBefore = handleChange.mock.calls.length;

            fireEvent.pointerDown(gradient, {clientX: 100, clientY: 100});

            assert.ok(
                handleChange.mock.calls.length > callsBefore,
                'Color should change after clicking the gradient'
            );
        });

        it('clicking top-left corner produces white', () => {
            const {gradient, handleChange} = renderGradient();

            fireEvent.pointerDown(gradient, {clientX: 0, clientY: 0});

            const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1];
            assert.equal(lastCall[0].toUpperCase(), '#FFFFFF');
        });

        it('clicking bottom-left corner produces black', () => {
            const {gradient, handleChange} = renderGradient();

            fireEvent.pointerDown(gradient, {clientX: 0, clientY: 200});

            const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1];
            assert.equal(lastCall[0].toUpperCase(), '#000000');
        });
    });

    describe('hex input', () => {
        it('displays the current color', () => {
            render(<ColorPicker defaultValue="#FF0000" />);

            assert.ok(screen.getByDisplayValue('#FF0000'));
        });

        it('updates color when a valid hex is entered', () => {
            const handleChange = vi.fn();
            render(
                <ColorPickerRoot defaultValue="#FF0000" onChange={handleChange}>
                    <ColorPickerFormat />
                </ColorPickerRoot>
            );

            const input = screen.getByDisplayValue('#FF0000');
            fireEvent.change(input, {target: {value: '#00FF00'}});

            const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1];
            assert.equal(lastCall[0].toUpperCase(), '#00FF00');
        });

        it('ignores invalid hex input', () => {
            const handleChange = vi.fn();
            render(
                <ColorPickerRoot defaultValue="#FF0000" onChange={handleChange}>
                    <ColorPickerFormat />
                </ColorPickerRoot>
            );

            const callsBefore = handleChange.mock.calls.length;
            const input = screen.getByDisplayValue('#FF0000');
            fireEvent.change(input, {target: {value: 'not-a-color'}});

            assert.equal(handleChange.mock.calls.length, callsBefore);
        });
    });

    describe('controlled value', () => {
        it('updates when value prop changes', () => {
            const handleChange = vi.fn();
            const {rerender} = render(
                <ColorPickerRoot value="#FF0000" onChange={handleChange}>
                    <ColorPickerFormat />
                </ColorPickerRoot>
            );

            rerender(
                <ColorPickerRoot value="#00FF00" onChange={handleChange}>
                    <ColorPickerFormat />
                </ColorPickerRoot>
            );

            const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1];
            assert.equal(lastCall[0].toUpperCase(), '#00FF00');
        });
    });
});
