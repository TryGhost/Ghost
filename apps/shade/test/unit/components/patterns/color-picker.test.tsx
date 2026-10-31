import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import ColorPicker, {
  ColorPickerFormat,
  ColorPickerRoot,
  ColorPickerSelection,
} from '../../../../src/components/patterns/color-picker';
import { render } from '../../utils/test-utils';

describe('ColorPicker Component', () => {
  beforeAll(() => {
    // Radix Slider uses ResizeObserver internally — not available in jsdom
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
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
      expect(renderWithColor('#000000')).toBe('#000000');
    });

    it('reflects grey (#808080)', () => {
      expect(renderWithColor('#808080')).toBe('#808080');
    });
  });

  describe('gradient selection', () => {
    function renderGradient(defaultValue = '#FF0000') {
      const handleChange = vi.fn();
      render(
        <ColorPickerRoot defaultValue={defaultValue} onChange={handleChange}>
          <ColorPickerSelection data-testid="gradient" />
        </ColorPickerRoot>,
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
        toJSON: () => {},
      });

      return { gradient, handleChange };
    }

    it('updates color on single click without dragging', () => {
      const { gradient, handleChange } = renderGradient();
      const callsBefore = handleChange.mock.calls.length;

      fireEvent.pointerDown(gradient, { clientX: 100, clientY: 100 });

      expect(
        handleChange.mock.calls.length > callsBefore,
        'Color should change after clicking the gradient',
      ).toBeTruthy();
    });

    it('clicking top-left corner produces white', () => {
      const { gradient, handleChange } = renderGradient();

      fireEvent.pointerDown(gradient, { clientX: 0, clientY: 0 });

      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1];
      expect(lastCall[0].toUpperCase()).toBe('#FFFFFF');
    });

    it('clicking bottom-left corner produces black', () => {
      const { gradient, handleChange } = renderGradient();

      fireEvent.pointerDown(gradient, { clientX: 0, clientY: 200 });

      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1];
      expect(lastCall[0].toUpperCase()).toBe('#000000');
    });

    it('tracks one pointer throughout a drag and stops after release', () => {
      const { gradient, handleChange } = renderGradient();

      fireEvent.pointerDown(gradient, { clientX: 20, clientY: 20, pointerId: 1 });
      fireEvent.pointerMove(gradient, { clientX: 160, clientY: 120, pointerId: 1 });
      const dragCall = handleChange.mock.calls[handleChange.mock.calls.length - 1];

      fireEvent.pointerMove(gradient, { clientX: 40, clientY: 180, pointerId: 2 });
      expect(handleChange.mock.calls[handleChange.mock.calls.length - 1]).toStrictEqual(dragCall);

      fireEvent.pointerUp(gradient, { pointerId: 1 });
      fireEvent.pointerMove(gradient, { clientX: 100, clientY: 100, pointerId: 1 });
      expect(handleChange.mock.calls[handleChange.mock.calls.length - 1]).toStrictEqual(dragCall);
    });
  });

  describe('hex input', () => {
    it('displays the current color', () => {
      render(<ColorPicker defaultValue="#FF0000" />);

      expect(screen.getByDisplayValue('#FF0000')).toBeTruthy();
    });

    it('updates color when a valid hex is entered', () => {
      const handleChange = vi.fn();
      render(
        <ColorPickerRoot defaultValue="#FF0000" onChange={handleChange}>
          <ColorPickerFormat />
        </ColorPickerRoot>,
      );

      const input = screen.getByDisplayValue('#FF0000');
      fireEvent.change(input, { target: { value: '#00FF00' } });

      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1];
      expect(lastCall[0].toUpperCase()).toBe('#00FF00');
    });

    it('ignores invalid hex input', () => {
      const handleChange = vi.fn();
      render(
        <ColorPickerRoot defaultValue="#FF0000" onChange={handleChange}>
          <ColorPickerFormat />
        </ColorPickerRoot>,
      );

      const callsBefore = handleChange.mock.calls.length;
      const input = screen.getByDisplayValue('#FF0000');
      fireEvent.change(input, { target: { value: 'not-a-color' } });

      expect(handleChange.mock.calls.length).toBe(callsBefore);
    });
  });

  describe('controlled value', () => {
    it('updates when value prop changes', () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <ColorPickerRoot value="#FF0000" onChange={handleChange}>
          <ColorPickerFormat />
        </ColorPickerRoot>,
      );

      rerender(
        <ColorPickerRoot value="#00FF00" onChange={handleChange}>
          <ColorPickerFormat />
        </ColorPickerRoot>,
      );

      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1];
      expect(lastCall[0].toUpperCase()).toBe('#00FF00');
    });
  });
});
