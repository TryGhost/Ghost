/* eslint-disable react/no-array-index-key */
import Color from 'color';
import {PipetteIcon} from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import {
    type ComponentProps,
    createContext,
    type HTMLAttributes,
    memo,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {cn} from '@/lib/utils';

interface ColorPickerContextValue {
    hue: number;
    saturation: number;
    lightness: number;
    alpha: number;
    mode: string;
    setHue: (hue: number) => void;
    setSaturation: (saturation: number) => void;
    setLightness: (lightness: number) => void;
    setAlpha: (alpha: number) => void;
    setMode: (mode: string) => void;
}

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(
    undefined
);

export const useColorPicker = () => {
    const context = useContext(ColorPickerContext);

    if (!context) {
        throw new Error(
            'useColorPicker must be used within a ColorPickerProvider'
        );
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
    defaultValue = '#000000',
    onChange,
    className,
    ...props
}: ColorPickerProps) => {
    const selectedColor = Color(value);
    const defaultColor = Color(defaultValue);

    const [hue, setHue] = useState(
        selectedColor.hue() || defaultColor.hue() || 0
    );
    const [saturation, setSaturation] = useState(
        selectedColor.saturationl() || defaultColor.saturationl() || 100
    );
    const [lightness, setLightness] = useState(
        selectedColor.lightness() || defaultColor.lightness() || 50
    );
    const [alpha, setAlpha] = useState(
        selectedColor.alpha() * 100 || defaultColor.alpha() * 100
    );
    const [mode, setMode] = useState('hex');

    // Update color when controlled value changes
    useEffect(() => {
        if (value) {
            const color = Color(value);
            setHue(color.hue());
            setSaturation(color.saturationl());
            setLightness(color.lightness());
            setAlpha(color.alpha() * 100);
        }
    }, [value]);

    // Notify parent of changes
    useEffect(() => {
        if (onChange) {
            const color = Color.hsl(hue, saturation, lightness).alpha(
                alpha / 100
            );
            const hex = color.hex();
            onChange(hex);
        }
    }, [hue, saturation, lightness, alpha, onChange]);

    return (
        <ColorPickerContext.Provider
            value={{
                hue,
                saturation,
                lightness,
                alpha,
                mode,
                setHue,
                setSaturation,
                setLightness,
                setAlpha,
                setMode
            }}
        >
            <div
                className={cn('flex size-full flex-col gap-4', className)}
                {...props}
            />
        </ColorPickerContext.Provider>
    );
};

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerSelection = memo(
    ({className, ...props}: ColorPickerSelectionProps) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const [isDragging, setIsDragging] = useState(false);
        const [positionX, setPositionX] = useState(0);
        const [positionY, setPositionY] = useState(0);
        const {hue, saturation, lightness, setSaturation, setLightness} =
            useColorPicker();

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

        const handlePointerMove = useCallback(
            (event: PointerEvent) => {
                if (!(isDragging && containerRef.current)) {
                    return;
                }
                const rect = containerRef.current.getBoundingClientRect();
                const x = Math.max(
                    0,
                    Math.min(1, (event.clientX - rect.left) / rect.width)
                );
                const y = Math.max(
                    0,
                    Math.min(1, (event.clientY - rect.top) / rect.height)
                );
                setPositionX(x);
                setPositionY(y);
                setSaturation(x * 100);
                const topLightness = x < 0.01 ? 100 : 50 + 50 * (1 - x);
                const newLightness = topLightness * (1 - y);

                setLightness(newLightness);
            },
            [isDragging, setSaturation, setLightness]
        );

        useEffect(() => {
            const handlePointerUp = () => setIsDragging(false);

            if (isDragging) {
                window.addEventListener('pointermove', handlePointerMove);
                window.addEventListener('pointerup', handlePointerUp);
            }

            return () => {
                window.removeEventListener('pointermove', handlePointerMove);
                window.removeEventListener('pointerup', handlePointerUp);
            };
        }, [isDragging, handlePointerMove]);

        return (
            <div
                ref={containerRef}
                className={cn(
                    'relative size-full cursor-crosshair rounded',
                    className
                )}
                style={{
                    background: backgroundGradient
                }}
                onPointerDown={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                    handlePointerMove(e.nativeEvent);
                }}
                {...props}
            >
                <div
                    className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                    style={{
                        left: `${positionX * 100}%`,
                        top: `${positionY * 100}%`,
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.5)'
                    }}
                />
            </div>
        );
    }
);

ColorPickerSelection.displayName = 'ColorPickerSelection';

export type ColorPickerHueProps = ComponentProps<typeof Slider.Root>;

export const ColorPickerHue = ({
    className,
    ...props
}: ColorPickerHueProps) => {
    const {hue, setHue} = useColorPicker();

    return (
        <Slider.Root
            className={cn('relative flex h-4 w-full touch-none', className)}
            max={360}
            step={1}
            value={[hue]}
            onValueChange={([value]) => setHue(value)}
            {...props}
        >
            <Slider.Track className="relative my-0.5 h-3 w-full grow rounded-full bg-[linear-gradient(90deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)]">
                <Slider.Range className="absolute h-full" />
            </Slider.Track>
            <Slider.Thumb className="block size-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
        </Slider.Root>
    );
};

export type ColorPickerAlphaProps = ComponentProps<typeof Slider.Root>;

export const ColorPickerAlpha = ({
    className,
    ...props
}: ColorPickerAlphaProps) => {
    const {alpha, setAlpha} = useColorPicker();

    return (
        <Slider.Root
            className={cn('relative flex h-4 w-full touch-none', className)}
            max={100}
            step={1}
            value={[alpha]}
            onValueChange={([value]) => setAlpha(value)}
            {...props}
        >
            <Slider.Track className="relative my-0.5 h-3 w-full grow rounded-full bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==')] bg-center bg-repeat-x dark:bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAALklEQVR4nGP8+vWrCAMewM3N/QafPBM+SWLAqAGDwQBGQgoIpZOB98KoAVQwAADxzQcSVIRCfQAAAABJRU5ErkJggg==')]">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent to-black/50 dark:to-white/50" />
                <Slider.Range className="absolute h-full rounded-full bg-transparent" />
            </Slider.Track>
            <Slider.Thumb className="block size-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
        </Slider.Root>
    );
};

export type ColorPickerEyeDropperProps = ComponentProps<typeof Button>;

export const ColorPickerEyeDropper = ({
    className,
    ...props
}: ColorPickerEyeDropperProps) => {
    const {setHue, setSaturation, setLightness, setAlpha} = useColorPicker();

    // Check if EyeDropper API is supported
    const isSupported = typeof window !== 'undefined' && 'EyeDropper' in window;
    if (!isSupported) {
        return null;
    }

    const handleEyeDropper = async () => {
        try {
            // @ts-expect-error - EyeDropper API is experimental
            const eyeDropper = new EyeDropper();
            const result = await eyeDropper.open();
            const color = Color(result.sRGBHex);
            const [h, s, l] = color.hsl().array();

            setHue(h);
            setSaturation(s);
            setLightness(l);
            setAlpha(100);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('EyeDropper failed:', error);
        }
    };

    return (
        <Button
            className={cn('shrink-0 text-muted-foreground size-8', className)}
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

export const ColorPickerOutput = ({...props}: ColorPickerOutputProps) => {
    const {mode, setMode} = useColorPicker();

    return (
        <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="h-8 w-20 shrink-0 text-xs" {...props}>
                <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
                {formats.map(format => (
                    <SelectItem key={format} className="text-xs" value={format}>
                        {format.toUpperCase()}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};

export type ColorPickerFormatProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerFormat = ({
    className,
    ...props
}: ColorPickerFormatProps) => {
    const {
        hue,
        saturation,
        lightness,
        mode,
        setHue,
        setSaturation,
        setLightness,
        setAlpha
    } = useColorPicker();
    const color = Color.hsl(hue, saturation, lightness);
    const [inputValue, setInputValue] = useState<string | null>(null);

    const handleInputChange = (value: string, index?: number) => {
        try {
            if (mode === 'hex') {
                const newColor = Color(value);
                setHue(newColor.hue());
                setSaturation(newColor.saturationl());
                setLightness(newColor.lightness());
                setAlpha(newColor.alpha() * 100);
            } else if ((mode === 'rgb' || mode === 'hsl') && index !== undefined) {
                const values = color
                    [mode]()
                    .array()
                    .map(v => Math.round(v));
                values[index] = parseInt(value, 10) || 0;
                const newColor = Color[mode](values[0], values[1], values[2]);
                setHue(newColor.hue());
                setSaturation(newColor.saturationl());
                setLightness(newColor.lightness());
            }
        } catch (error) {
            // Invalid color, ignore
        }
    };

    if (mode === 'hex') {
        const hex = color.hex();

        return (
            <div
                className={cn(
                    '-space-x-px relative flex w-full items-center rounded-md',
                    className
                )}
                {...props}
            >
                <Input
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
            .map(value => Math.round(value));

        return (
            <div
                className={cn(
                    '-space-x-px flex flex-1 items-stretch rounded-md',
                    className
                )}
                {...props}
            >
                {values.map((value, index) => (
                    <Input
                        key={index}
                        className={cn(
                            'h-8 px-2 font-mono text-xs flex-1 shadow-none focus:z-10',
                            index && 'rounded-l-none',
                            index < values.length - 1 && 'rounded-r-none'
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
