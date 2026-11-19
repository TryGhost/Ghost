/* eslint-disable react/no-array-index-key */
import Color from 'color';
import { PipetteIcon } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import {
  type ButtonHTMLAttributes,
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  forwardRef,
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface ColorSwatchOption {
  title: string;
  hex: string;
  value?: string | null;
}

export interface ColorSwatchProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'value' | 'onSelect'
> {
  color: string;
  selected?: boolean;
  size?: 'md' | 'lg';
}

const isTransparent = (color: string) => {
  const normalized = color.toLowerCase();
  return (
    normalized === 'transparent' ||
    (normalized.length === 5 && normalized[4] === '0') ||
    (normalized.length === 9 && normalized.slice(7) === '00')
  );
};

export const ColorSwatch = ({
  color,
  selected,
  size = 'md',
  className,
  style,
  ...props
}: ColorSwatchProps) => (
  <button
    aria-pressed={selected}
    className={cn(
      'relative flex shrink-0 cursor-pointer items-center overflow-hidden rounded-full border border-control-border',
      size === 'lg' ? 'size-6' : 'size-5',
      selected && 'ring-2 ring-focus-ring',
      className,
    )}
    style={{ backgroundColor: color, ...style }}
    type="button"
    {...props}
  >
    {isTransparent(color) && (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-[-30%] block h-px w-[160%] -translate-y-1/2 -rotate-45 bg-destructive"
        data-testid="transparent-indicator"
      />
    )}
  </button>
);

export interface ColorSwatchRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  swatches: ColorSwatchOption[];
  value?: string | null;
  size?: 'md' | 'lg';
  onSelect: (value: string | null) => void;
}

export const ColorSwatchRow = ({
  swatches,
  value,
  size = 'md',
  onSelect,
  className,
  ...props
}: ColorSwatchRowProps) => (
  <div className={cn('flex items-center gap-1', className)} {...props}>
    {swatches.map((swatch) => {
      const swatchValue = swatch.value === undefined ? swatch.hex : swatch.value;
      return (
        <ColorSwatch
          key={swatch.title}
          aria-label={swatch.title}
          color={swatch.hex}
          selected={swatchValue === value || swatch.hex.toLowerCase() === value?.toLowerCase()}
          size={size}
          title={swatch.title}
          onClick={() => onSelect(swatchValue)}
        />
      );
    })}
  </div>
);

export interface ColorPickerTriggerProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'value'
> {
  value?: string | null;
}

export const ColorPickerTrigger = forwardRef<HTMLButtonElement, ColorPickerTriggerProps>(
  ({ value, className, ...props }, ref) => (
    <button
      ref={ref}
      aria-label="Pick color"
      className={cn(
        'relative size-6 cursor-pointer rounded-full border border-control-border',
        className,
      )}
      type="button"
      {...props}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-[conic-gradient(hsl(360,100%,50%),hsl(315,100%,50%),hsl(270,100%,50%),hsl(225,100%,50%),hsl(180,100%,50%),hsl(135,100%,50%),hsl(90,100%,50%),hsl(45,100%,50%),hsl(0,100%,50%))]"
      />
      {value && (
        <span
          className="absolute inset-[3px] overflow-hidden rounded-full border border-background"
          style={{ backgroundColor: value }}
        />
      )}
    </button>
  ),
);

ColorPickerTrigger.displayName = 'ColorPickerTrigger';

interface HslaColor {
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
}

const toHsla = (input: Parameters<typeof Color>[0]): HslaColor => {
  const color = Color(input);
  return {
    hue: color.hue(),
    saturation: color.saturationl(),
    lightness: color.lightness(),
    alpha: color.alpha() * 100,
  };
};

const toColor = ({ hue, saturation, lightness, alpha }: HslaColor) =>
  Color.hsl(hue, saturation, lightness).alpha(alpha / 100);

// How a value reads when compared with a reported hex. A string is compared as written, so
// hsl() black with a different hue doesn't count as #000000. Of other values, only an opaque
// RGB one carries no more than a report does: an HSL object has a hue, and an alpha is lost.
const echoKey = (value: Parameters<typeof Color>[0]) => {
  if (typeof value === 'string') {
    return value.toUpperCase();
  }
  const isRgb =
    typeof value === 'number' ||
    Array.isArray(value) ||
    (typeof value === 'object' && value !== null && 'r' in value);
  if (!isRgb) {
    return null;
  }
  const color = Color(value);
  return color.alpha() === 1 ? color.hex() : null;
};

// A control can change a channel without changing the colour, e.g. saturation on black. That
// still counts: a caller that showed transparent as #00000000 needs to hear about #000000.
const isSameHsla = (a: HslaColor, b: HslaColor) =>
  a.hue === b.hue &&
  a.saturation === b.saturation &&
  a.lightness === b.lightness &&
  a.alpha === b.alpha;

// A change to some channels, or a function that works one out from the latest colour.
type ColorChange = Partial<HslaColor> | ((current: HslaColor) => Partial<HslaColor>);

interface ColorPickerContextValue extends HslaColor {
  mode: string;
  // Applies a change made in the picker and reports it through onChange.
  setColor: (change: ColorChange) => void;
  setMode: (mode: string) => void;
}

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(undefined);

const useColorPicker = () => {
  const context = useContext(ColorPickerContext);

  if (!context) {
    throw new Error('useColorPicker must be used within a ColorPickerProvider');
  }

  return context;
};

export type ColorPickerProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  value?: Parameters<typeof Color>[0];
  defaultValue?: Parameters<typeof Color>[0];
  onChange?: (value: string) => void;
};

export const ColorPickerRoot = ({
  value,
  defaultValue = 'rgb(0 0 0)',
  onChange,
  className,
  ...props
}: ColorPickerProps) => {
  const [color, setColorState] = useState(() => toHsla(value ?? defaultValue));
  const [mode, setMode] = useState('hex');
  // Several changes can land before a re-render, so each one builds on the latest colour.
  const colorRef = useRef(color);
  // The hex last reported through onChange, to recognise the parent echoing it back.
  const lastReportedRef = useRef<string | null>(null);
  // An eye dropper pick resolves later, so it reports to the latest onChange.
  const onChangeRef = useRef(onChange);

  useLayoutEffect(() => {
    onChangeRef.current = onChange;
  });

  // Follow a controlled value without reporting it back through onChange. A layout effect
  // runs in the same task as the commit, so no change can land before the sync and be undone.
  useLayoutEffect(() => {
    // 0 is black, so only a missing or empty value is skipped.
    if (value === undefined || value === null || value === '') {
      return;
    }
    // The parent echoing the last report: keep the picker's own channels, which a hex can't
    // always carry (e.g. the hue of a grey). Anything else is adopted in full, including an
    // earlier colour, another way of writing this one, or the same hex with an alpha.
    if (lastReportedRef.current !== null && echoKey(value) === lastReportedRef.current) {
      return;
    }
    lastReportedRef.current = null;
    const next = toHsla(value);
    if (!isSameHsla(next, colorRef.current)) {
      colorRef.current = next;
      setColorState(next);
    }
  }, [value]);

  const setColor = useCallback((change: ColorChange) => {
    const previous = colorRef.current;
    const next = { ...previous, ...(typeof change === 'function' ? change(previous) : change) };
    if (isSameHsla(next, previous)) {
      return;
    }
    colorRef.current = next;
    setColorState(next);

    const report = onChangeRef.current;
    const hex = report ? toColor(next).hex() : null;
    // Without an onChange this change isn't reported, so an earlier report is no longer the
    // colour shown and can't be echoed.
    lastReportedRef.current = hex;
    if (report && hex) {
      report(hex);
    }
  }, []);

  return (
    <ColorPickerContext.Provider value={{ ...color, mode, setColor, setMode }}>
      <div className={cn('flex size-full flex-col gap-4', className)} {...props} />
    </ColorPickerContext.Provider>
  );
};

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerSelection = memo(({ className, ...props }: ColorPickerSelectionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const { hue, saturation, lightness, setColor } = useColorPicker();

  const backgroundGradient = useMemo(() => {
    return `linear-gradient(0deg, rgba(0,0,0,1), rgba(0,0,0,0)),
            linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0)),
            hsl(${hue}, 100%, 50%)`;
  }, [hue]);

  // Update position based on current saturation and lightness values
  useEffect(() => {
    const x = saturation / 100;
    const topLightness = x < 0.01 ? 100 : 50 + 50 * (1 - x);
    const y = Math.max(0, Math.min(1, 1 - lightness / topLightness));

    setPositionX(x);
    setPositionY(y);
  }, [saturation, lightness]);

  const updateColorFromPointer = useCallback(
    (event: PointerEvent) => {
      if (!containerRef.current) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      setPositionX(x);
      setPositionY(y);
      const topLightness = x < 0.01 ? 100 : 50 + 50 * (1 - x);

      setColor({ saturation: x * 100, lightness: topLightness * (1 - y) });
    },
    [setColor],
  );

  return (
    <div
      ref={containerRef}
      className={cn('relative size-full cursor-crosshair rounded', className)}
      style={{
        background: backgroundGradient,
      }}
      onPointerCancel={(e) => {
        if (activePointerId.current === e.pointerId) {
          activePointerId.current = null;
        }
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        activePointerId.current = e.pointerId;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        updateColorFromPointer(e.nativeEvent);
      }}
      onPointerMove={(e) => {
        if (activePointerId.current === e.pointerId) {
          updateColorFromPointer(e.nativeEvent);
        }
      }}
      onPointerUp={(e) => {
        if (activePointerId.current === e.pointerId) {
          activePointerId.current = null;
          e.currentTarget.releasePointerCapture?.(e.pointerId);
        }
      }}
      {...props}
    >
      <div
        className="pointer-events-none absolute size-4 -translate-1/2 rounded-full border-2 border-white"
        style={{
          left: `${positionX * 100}%`,
          top: `${positionY * 100}%`,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  );
});

ColorPickerSelection.displayName = 'ColorPickerSelection';

export type ColorPickerHueProps = ComponentProps<typeof Slider.Root>;

export const ColorPickerHue = ({ className, ...props }: ColorPickerHueProps) => {
  const { hue, setColor } = useColorPicker();

  return (
    <Slider.Root
      className={cn('relative flex h-4 w-full touch-none', className)}
      max={360}
      step={1}
      value={[hue]}
      onValueChange={([value]) => setColor({ hue: value })}
      {...props}
    >
      <Slider.Track className="relative my-0.5 h-3 w-full grow rounded-full bg-[linear-gradient(90deg,red,yellow,lime,aqua,blue,magenta,red)]">
        <Slider.Range className="absolute h-full" />
      </Slider.Track>
      <Slider.Thumb className="block size-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50" />
    </Slider.Root>
  );
};

export type ColorPickerAlphaProps = ComponentProps<typeof Slider.Root>;

export const ColorPickerAlpha = ({ className, ...props }: ColorPickerAlphaProps) => {
  const { alpha, setColor } = useColorPicker();

  return (
    <Slider.Root
      className={cn('relative flex h-4 w-full touch-none', className)}
      max={100}
      step={1}
      value={[alpha]}
      onValueChange={([value]) => setColor({ alpha: value })}
      {...props}
    >
      <Slider.Track className="relative my-0.5 h-3 w-full grow rounded-full bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==')] bg-center bg-repeat-x dark:bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAALklEQVR4nGP8+vWrCAMewM3N/QafPBM+SWLAqAGDwQBGQgoIpZOB98KoAVQwAADxzQcSVIRCfQAAAABJRU5ErkJggg==')]">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent to-black/50 dark:to-white/50" />
        <Slider.Range className="absolute h-full rounded-full bg-transparent" />
      </Slider.Track>
      <Slider.Thumb className="block size-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50" />
    </Slider.Root>
  );
};

export type ColorPickerEyeDropperProps = ComponentProps<typeof Button>;

export const ColorPickerEyeDropper = ({ className, ...props }: ColorPickerEyeDropperProps) => {
  const { setColor } = useColorPicker();
  const pendingPick = useRef<AbortController | null>(null);

  // A pick still open when the picker goes away must not report a colour. A layout effect
  // aborts it as the picker is removed, before a pick resolving in between can report.
  useLayoutEffect(() => () => pendingPick.current?.abort(), []);

  // Check if EyeDropper API is supported
  const isSupported = typeof window !== 'undefined' && 'EyeDropper' in window;
  if (!isSupported) {
    return null;
  }

  const handleEyeDropper = async () => {
    pendingPick.current?.abort();
    const controller = new AbortController();
    pendingPick.current = controller;

    let picked: number[];
    try {
      // @ts-expect-error - EyeDropper API is experimental
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open({ signal: controller.signal });
      picked = Color(result.sRGBHex).hsl().array();
    } catch (error) {
      if (!controller.signal.aborted) {
        // eslint-disable-next-line no-console
        console.error('EyeDropper failed:', error);
      }
      return;
    }
    if (controller.signal.aborted) {
      return;
    }

    // Outside the try, so an error thrown by onChange reaches the caller.
    const [hue, saturation, lightness] = picked;
    setColor({ hue, saturation, lightness, alpha: 100 });
  };

  return (
    <Button
      className={cn('size-8 shrink-0 text-muted-foreground', className)}
      size="icon"
      type="button"
      variant="outline"
      onClick={handleEyeDropper}
      {...props}
    >
      <PipetteIcon size={16} />
    </Button>
  );
};

export type ColorPickerOutputProps = ComponentProps<typeof SelectTrigger>;

const formats = ['hex', 'rgb', 'hsl'];

export const ColorPickerOutput = ({ ...props }: ColorPickerOutputProps) => {
  const { mode, setMode } = useColorPicker();

  return (
    <Select value={mode} onValueChange={setMode}>
      <SelectTrigger className="h-8 w-20 shrink-0 text-xs" {...props}>
        <SelectValue placeholder="Mode" />
      </SelectTrigger>
      <SelectContent>
        {formats.map((format) => (
          <SelectItem key={format} className="text-xs" value={format}>
            {format.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export type ColorPickerFormatProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerFormat = ({ className, ...props }: ColorPickerFormatProps) => {
  const { hue, saturation, lightness, mode, setColor } = useColorPicker();
  const color = Color.hsl(hue, saturation, lightness);
  const [inputValue, setInputValue] = useState<string | null>(null);

  // Only parsing sits inside a try, so an error thrown by onChange reaches the caller.
  const handleInputChange = (value: string, index?: number) => {
    if (mode === 'hex') {
      let next: HslaColor;
      try {
        next = toHsla(value);
      } catch {
        // Invalid color, ignore
        return;
      }
      setColor(next);
    } else if ((mode === 'rgb' || mode === 'hsl') && index !== undefined) {
      // Built from the latest colour, which may be newer than this render's. The color
      // library clamps out-of-range channels, so this can't throw.
      setColor((current) => {
        const values = Color.hsl(current.hue, current.saturation, current.lightness)
          [mode]()
          .array()
          .map((v) => Math.round(v));
        values[index] = parseInt(value, 10) || 0;
        const newColor = toHsla(Color[mode](values[0], values[1], values[2]));
        return {
          hue: newColor.hue,
          saturation: newColor.saturation,
          lightness: newColor.lightness,
        };
      });
    }
  };

  if (mode === 'hex') {
    const hex = color.hex();

    return (
      <div
        className={cn('relative flex w-full items-center -space-x-px rounded-md', className)}
        {...props}
      >
        <Input
          aria-label="Hex color"
          className="h-8 px-2 font-mono text-xs shadow-none"
          type="text"
          value={inputValue ?? hex}
          onBlur={() => {
            setInputValue(null);
          }}
          onChange={(e) => {
            setInputValue(e.target.value);
            handleInputChange(e.target.value);
          }}
        />
      </div>
    );
  }

  if (mode === 'rgb' || mode === 'hsl') {
    const values = color[mode]()
      .array()
      .map((value) => Math.round(value));

    return (
      <div className={cn('flex flex-1 items-stretch -space-x-px rounded-md', className)} {...props}>
        {values.map((value, index) => (
          <Input
            key={index}
            aria-label={`${mode.toUpperCase()} channel ${index + 1}`}
            className={cn(
              'h-8 flex-1 px-2 font-mono text-xs shadow-none focus:z-10',
              index && 'rounded-l-none',
              index < values.length - 1 && 'rounded-r-none',
            )}
            maxLength={3}
            size={4}
            type="text"
            value={value}
            onChange={(e) => {
              handleInputChange(e.target.value, index);
            }}
          />
        ))}
      </div>
    );
  }

  return null;
};

const ColorPicker = (props: ColorPickerProps) => (
  <ColorPickerRoot className="w-auto min-w-80" {...props}>
    <ColorPickerSelection className="aspect-square" />
    <div className="flex items-center gap-4">
      <ColorPickerEyeDropper />
      <ColorPickerHue />
    </div>
    <div className="flex items-center gap-4">
      <ColorPickerOutput />
      <ColorPickerFormat />
    </div>
  </ColorPickerRoot>
);

export default ColorPicker;
