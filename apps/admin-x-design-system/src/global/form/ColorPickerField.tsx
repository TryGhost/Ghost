import clsx from 'clsx';
import {ReactNode, createContext, useContext, useEffect, useId, useMemo, useState} from 'react';
import {debounce} from '../../utils/debounce';
import ColorIndicator, {SwatchOption} from './ColorIndicator';
import ColorPicker from './ColorPicker';
import {ToggleDirections} from './Toggle';

const ColorPickerContext = createContext<{colorPickers: Array<{ id: string; setExpanded: ((expanded: boolean) => void) }>}>({
    colorPickers: []
});

const to6DigitHex = (hex: string) => {
    if (hex.length === 4) {
        return hex.replace(/#(.)(.)(.)/, '#$1$1$2$2$3$3');
    } else {
        return hex;
    }
};

export interface ColorPickerFieldProps {
    testId?: string;
    title?: ReactNode;
    direction?: ToggleDirections;
    hint?: ReactNode;
    error?: boolean;
    value?: string | null;
    eyedropper?: boolean;
    clearButtonValue?: string | null;
    onChange?: (newValue: string | null) => void;
    swatches?: SwatchOption[];
    alwaysOpen?: boolean;
    debounceMs?: number;
}

const ColorPickerField: React.FC<ColorPickerFieldProps> = ({testId, title, direction, value, hint, error, eyedropper, clearButtonValue, onChange, swatches = [], alwaysOpen = false, debounceMs}) => {
    const [isExpanded, setExpanded] = useState(false);
    const [localValue, setLocalValue] = useState(value);
    const context = useContext(ColorPickerContext);
    const id = useId();

    useEffect(() => {
        setLocalValue((currentValue) => {
            // If the current value is the 3-digit equivalent of the new value,
            // the user probably typed it as 3 digits so keep showing it that way in the UI
            if (to6DigitHex(currentValue || '') === value) {
                return currentValue;
            }

            return value;
        });
    }, [value]);

    useEffect(() => {
        context.colorPickers.push({id, setExpanded});

        return () => {
            context.colorPickers = context.colorPickers.filter(item => item.id !== id);
        };
    }, [context, id]);

    // Close on click outside
    useEffect(() => {
        if (isExpanded) {
            context.colorPickers.filter(item => item.id !== id).forEach(item => item.setExpanded(false));

            const closePicker = () => {
                setExpanded(false);
            };
            document.addEventListener('click', closePicker);

            return () => {
                document.removeEventListener('click', closePicker);
            };
        }
    }, [context, id, isExpanded]);

    const debouncedOnChange = useMemo(() => {
        if (onChange && debounceMs) {
            return debounce(onChange, debounceMs);
        } else {
            return onChange;
        }
    }, [debounceMs, onChange]);

    const handleChange = (newValue: string | null) => {
        setLocalValue(newValue);
        debouncedOnChange?.(newValue ? to6DigitHex(newValue) : null);
    };

    let content = (
        <ColorIndicator
            isExpanded={isExpanded}
            swatches={swatches}
            value={localValue}
            onSwatchChange={(newValue) => {
                handleChange(newValue);
                setExpanded(false);
            }}
            onTogglePicker={() => !alwaysOpen && setExpanded(!isExpanded)}
        />
    );

    if (title) {
        content = (
            <div className={clsx('flex w-full cursor-pointer items-start first:mt-0 dark:text-white', direction === 'rtl' && 'flex-row-reverse')}>
                <div className="shrink-0">
                    {content}
                </div>
                <div className={clsx('flex-1', direction === 'rtl' ? 'pr-2' : 'pl-2', hint ? 'mt-[-2px]' : 'mt-[1px]')} onClick={() => !alwaysOpen && setExpanded(!isExpanded)}>
                    {title}
                    {hint && <div className={`text-xs ${error ? 'text-red' : 'text-grey-700'}`}>{hint}</div>}
                </div>
            </div>
        );
    }

    const selectedSwatch = swatches.find(swatch => swatch.value === localValue);

    return (
        <div className="flex-col" data-testid={testId} onClick={event => event.stopPropagation()}>
            {content}
            {(alwaysOpen || isExpanded) && <ColorPicker clearButtonValue={clearButtonValue} eyedropper={eyedropper} hexValue={selectedSwatch?.hex || localValue || undefined} onChange={handleChange} />}
        </div>
    );
};

export default ColorPickerField;
