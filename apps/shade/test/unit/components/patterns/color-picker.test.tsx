import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import ColorPicker, {
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerRoot,
  ColorPickerSelection,
} from '../../../../src/components/patterns/color-picker';
import { render } from '../../utils/test-utils';

function mockGradientRect() {
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
  return gradient;
}

describe('ColorPicker Component', () => {
  beforeAll(() => {
    // Radix Slider uses ResizeObserver internally — not available in jsdom
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    // Radix Select scrolls the selected option into view, which jsdom doesn't implement
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  describe('initial color', () => {
    function renderWithColor(defaultValue: string) {
      render(<ColorPicker defaultValue={defaultValue} />);
      return (screen.getByLabelText('Hex color') as HTMLInputElement).value;
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

      return { gradient: mockGradientRect(), handleChange };
    }

    it('updates color on single click without dragging', () => {
      const { gradient, handleChange } = renderGradient();

      fireEvent.pointerDown(gradient, { clientX: 100, clientY: 100 });

      // Saturation and lightness change together, and are reported once.
      expect(handleChange).toHaveBeenCalledTimes(1);
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
      const { rerender } = render(
        <ColorPickerRoot value="#FF0000">
          <ColorPickerFormat />
        </ColorPickerRoot>,
      );

      rerender(
        <ColorPickerRoot value="#00FF00">
          <ColorPickerFormat />
        </ColorPickerRoot>,
      );

      expect(screen.getByDisplayValue('#00FF00')).toBeTruthy();
    });
  });

  describe('onChange', () => {
    // A parent that passes a new inline onChange on every render, like most callers do.
    function Parent({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
      return (
        <ColorPickerRoot value={value} onChange={(hex) => onChange(hex)}>
          <ColorPickerHue />
          <ColorPickerFormat />
        </ColorPickerRoot>
      );
    }

    it('is not called on mount', () => {
      const handleChange = vi.fn();
      render(<Parent value="#ff0000" onChange={handleChange} />);

      expect(handleChange).not.toHaveBeenCalled();
    });

    it('is not called when the parent re-renders', () => {
      const handleChange = vi.fn();
      const { rerender } = render(<Parent value="#ff0000" onChange={handleChange} />);
      handleChange.mockClear();

      rerender(<Parent value="#ff0000" onChange={handleChange} />);
      rerender(<Parent value="#ff0000" onChange={handleChange} />);

      expect(handleChange).not.toHaveBeenCalled();
    });

    it('is not called when value changes', () => {
      // A stable onChange, so only the new value could trigger a call.
      const handleChange = vi.fn();
      const { rerender } = render(
        <ColorPickerRoot value="#ff0000" onChange={handleChange}>
          <ColorPickerFormat />
        </ColorPickerRoot>,
      );
      handleChange.mockClear();

      rerender(
        <ColorPickerRoot value="#00ff00" onChange={handleChange}>
          <ColorPickerFormat />
        </ColorPickerRoot>,
      );

      expect(screen.getByDisplayValue('#00FF00')).toBeTruthy();
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('builds the next change on a colour synced from value', () => {
      const handleChange = vi.fn();
      const { rerender } = render(<Parent value="#ff0000" onChange={handleChange} />);
      rerender(<Parent value="#00ff00" onChange={handleChange} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith('#00FF04');
    });

    it('is called once when the hue slider moves', () => {
      const handleChange = vi.fn();
      render(<Parent value="#ff0000" onChange={handleChange} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith('#FF0400');
    });

    it('is called once when a typed colour changes hue, saturation and lightness', () => {
      const handleChange = vi.fn();
      render(<Parent value="#ff0000" onChange={handleChange} />);

      fireEvent.change(screen.getByLabelText('Hex color'), { target: { value: '#336699' } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith('#336699');
    });

    it('is called when only the alpha changes', () => {
      const handleChange = vi.fn();
      render(
        <ColorPickerRoot value="#ff0000" onChange={handleChange}>
          <ColorPickerAlpha />
        </ColorPickerRoot>,
      );

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowLeft' });

      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('is called when an opaque colour replaces a transparent one with the same hex', () => {
      const handleChange = vi.fn();
      render(
        <ColorPickerRoot defaultValue="#00000000" onChange={handleChange}>
          <ColorPickerFormat />
        </ColorPickerRoot>,
      );

      // The input already shows #000000, so type the short form of opaque black.
      fireEvent.change(screen.getByLabelText('Hex color'), { target: { value: '#000' } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith('#000000');
    });

    it('keeps its hue when the parent echoes back a colour that has none', () => {
      function Controlled() {
        const [value, setValue] = useState('#0000ff');
        return (
          <ColorPickerRoot value={value} onChange={setValue}>
            <ColorPickerSelection data-testid="gradient" />
            <ColorPickerHue />
          </ColorPickerRoot>
        );
      }
      render(<Controlled />);

      // The bottom edge is black, which carries no hue.
      fireEvent.pointerDown(mockGradientRect(), { clientX: 100, clientY: 200 });

      expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe('240');
    });

    it('builds each change on the one before when both land before a re-render', () => {
      const handleChange = vi.fn();
      render(
        <ColorPickerRoot defaultValue="#ff0000" onChange={handleChange}>
          <ColorPickerSelection data-testid="gradient" />
          <ColorPickerHue />
        </ColorPickerRoot>,
      );
      const gradient = mockGradientRect();

      act(() => {
        fireEvent.pointerDown(gradient, { clientX: 100, clientY: 100 });
        fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
      });

      // The hue step keeps the saturation and lightness the click set.
      expect(handleChange.mock.calls).toEqual([['#8F3030'], ['#8F3130']]);
    });

    it('builds an RGB channel edit on a change that landed before a re-render', () => {
      const handleChange = vi.fn();
      render(
        <ColorPickerRoot defaultValue="#ff0000" onChange={handleChange}>
          <ColorPickerSelection data-testid="gradient" />
          <ColorPickerOutput />
          <ColorPickerFormat />
        </ColorPickerRoot>,
      );
      fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
      fireEvent.keyDown(screen.getByRole('option', { name: 'RGB' }), { key: 'Enter' });
      const gradient = mockGradientRect();

      act(() => {
        fireEvent.pointerDown(gradient, { clientX: 100, clientY: 100 });
        fireEvent.change(screen.getByLabelText('RGB channel 2'), { target: { value: '64' } });
      });

      // Green changes; red and blue are the click's, not the starting red's.
      expect(handleChange.mock.calls).toEqual([['#8F3030'], ['#8F4030']]);
    });

    it('adopts a value reset to a colour picked earlier', () => {
      const handleChange = vi.fn();
      const { rerender } = render(<Parent value="#ff0000" onChange={handleChange} />);
      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
      expect(handleChange.mock.calls).toEqual([['#FF0400'], ['#FF0900']]);

      rerender(<Parent value="#FF0400" onChange={handleChange} />);

      expect(Number(screen.getByRole('slider').getAttribute('aria-valuenow'))).toBeCloseTo(1, 0);
      expect(handleChange).toHaveBeenCalledTimes(2);
    });

    it('adopts a value with the reported hex plus an alpha', () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <ColorPickerRoot value="#00ff00" onChange={handleChange}>
          <ColorPickerAlpha />
          <ColorPickerFormat />
        </ColorPickerRoot>,
      );
      fireEvent.change(screen.getByLabelText('Hex color'), { target: { value: '#FF0000' } });
      expect(handleChange).toHaveBeenCalledWith('#FF0000');

      rerender(
        <ColorPickerRoot value={[255, 0, 0, 0.5]} onChange={handleChange}>
          <ColorPickerAlpha />
          <ColorPickerFormat />
        </ColorPickerRoot>,
      );

      expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe('50');
    });

    it('lets an error thrown by onChange reach the caller', () => {
      render(
        <ColorPickerRoot
          defaultValue="#ff0000"
          onChange={() => {
            throw new Error('onChange failed');
          }}
        >
          <ColorPickerFormat />
        </ColorPickerRoot>,
      );
      // jsdom reports an error thrown in an event listener on window, not to the dispatcher.
      const errors: unknown[] = [];
      const recordError = (event: ErrorEvent) => {
        errors.push(event.error);
        event.preventDefault();
      };
      window.addEventListener('error', recordError);

      fireEvent.change(screen.getByLabelText('Hex color'), { target: { value: '#00ff00' } });
      window.removeEventListener('error', recordError);

      expect(errors.map((error) => (error as Error).message)).toContain('onChange failed');
    });

    it('recognises an echo passed as a new array on every render', () => {
      function ArrayParent() {
        const [, setReports] = useState(0);
        return (
          <ColorPickerRoot
            value={[0, 0, 0]}
            onChange={() =>
              setReports((count) => {
                // Fail fast instead of hanging the run if the picker loops.
                if (count > 10) {
                  throw new Error('onChange looped');
                }
                return count + 1;
              })
            }
          >
            <ColorPickerHue />
          </ColorPickerRoot>
        );
      }
      render(<ArrayParent />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });

      expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe('1');
    });

    it('adopts a new value when nothing was reported, even one matching the shown hex', () => {
      const { rerender } = render(
        <ColorPickerRoot value="#0000FF">
          <ColorPickerAlpha />
          <ColorPickerFormat />
        </ColorPickerRoot>,
      );
      fireEvent.change(screen.getByLabelText('Hex color'), { target: { value: '#FF000080' } });
      expect(Number(screen.getByRole('slider').getAttribute('aria-valuenow'))).toBeCloseTo(50, 0);

      rerender(
        <ColorPickerRoot value="#FF0000">
          <ColorPickerAlpha />
          <ColorPickerFormat />
        </ColorPickerRoot>,
      );

      expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe('100');
    });

    it('adopts a new value with the same hex as the colour just picked', () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <ColorPickerRoot value="#0000ff" onChange={handleChange}>
          <ColorPickerSelection data-testid="gradient" />
          <ColorPickerHue />
        </ColorPickerRoot>,
      );
      // The bottom edge is black, which keeps the picker's hue of 240.
      fireEvent.pointerDown(mockGradientRect(), { clientX: 100, clientY: 200 });
      expect(handleChange).toHaveBeenCalledWith('#000000');

      rerender(
        <ColorPickerRoot value="hsl(120, 100%, 0%)" onChange={handleChange}>
          <ColorPickerSelection data-testid="gradient" />
          <ColorPickerHue />
        </ColorPickerRoot>,
      );

      expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe('120');
    });

    it('adopts every channel of a new value, even one with the same hex', () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <ColorPickerRoot value="hsl(240, 100%, 0%)" onChange={handleChange}>
          <ColorPickerHue />
        </ColorPickerRoot>,
      );

      rerender(
        <ColorPickerRoot value="hsl(120, 100%, 0%)" onChange={handleChange}>
          <ColorPickerHue />
        </ColorPickerRoot>,
      );

      expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe('120');
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('reports black from a transparent colour', () => {
      // Admin shows a transparent setting as #00000000; clicking black must still report it.
      const handleChange = vi.fn();
      render(
        <ColorPickerRoot defaultValue="#00000000" onChange={handleChange}>
          <ColorPickerSelection data-testid="gradient" />
        </ColorPickerRoot>,
      );

      fireEvent.pointerDown(mockGradientRect(), { clientX: 200, clientY: 200 });

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith('#000000');
    });

    it('is not called on mount and is called once per change in StrictMode', () => {
      const handleChange = vi.fn();
      render(
        <StrictMode>
          <Parent value="#ff0000" onChange={handleChange} />
        </StrictMode>,
      );

      expect(handleChange).not.toHaveBeenCalled();

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });

      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('settles when the parent stores the colour in a new object on every change', () => {
      const handleChange = vi.fn();
      function DraftForm() {
        const [draft, setDraft] = useState({ name: 'Member', colour: '#ff0000' });
        return (
          <ColorPickerRoot
            value={draft.colour}
            onChange={(colour) => {
              handleChange(colour);
              // Fail fast instead of hanging the run if the picker loops.
              if (handleChange.mock.calls.length > 10) {
                throw new Error('onChange looped');
              }
              setDraft((d) => ({ ...d, colour }));
            }}
          >
            <ColorPickerHue />
          </ColorPickerRoot>
        );
      }
      render(<DraftForm />);

      expect(handleChange).not.toHaveBeenCalled();

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });

      expect(handleChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('eye dropper', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    // An EyeDropper whose pick resolves when the test says so. Like a browser that is slow
    // to cancel, it ignores the abort signal and only records it.
    function mockEyeDropper() {
      let resolvePick: (result: { sRGBHex: string }) => void = () => {};
      let signal: AbortSignal | undefined;
      vi.stubGlobal(
        'EyeDropper',
        class {
          open(options?: { signal?: AbortSignal }) {
            signal = options?.signal;
            return new Promise((resolve) => {
              resolvePick = resolve;
            });
          }
        },
      );
      return {
        pick: (sRGBHex: string) => act(async () => resolvePick({ sRGBHex })),
        isAborted: () => signal?.aborted,
      };
    }

    function renderEyeDropper(onChange: (hex: string) => void) {
      return render(
        <ColorPickerRoot value="#ff0000" onChange={(hex) => onChange(hex)}>
          <ColorPickerEyeDropper />
        </ColorPickerRoot>,
      );
    }

    it('reports a pick to the latest onChange', async () => {
      const { pick } = mockEyeDropper();
      const first = vi.fn();
      const latest = vi.fn();
      const { rerender } = renderEyeDropper(first);

      fireEvent.click(screen.getByRole('button'));
      rerender(
        <ColorPickerRoot value="#ff0000" onChange={(hex) => latest(hex)}>
          <ColorPickerEyeDropper />
        </ColorPickerRoot>,
      );
      await pick('#0000ff');

      expect(first).not.toHaveBeenCalled();
      expect(latest).toHaveBeenCalledTimes(1);
      expect(latest).toHaveBeenCalledWith('#0000FF');
    });

    it('does not report a pick that resolves after the picker unmounts', async () => {
      const { pick, isAborted } = mockEyeDropper();
      const handleChange = vi.fn();
      const { unmount } = renderEyeDropper(handleChange);

      fireEvent.click(screen.getByRole('button'));
      unmount();
      await pick('#0000ff');

      expect(isAborted()).toBe(true);
      expect(handleChange).not.toHaveBeenCalled();
    });
  });
});
