import Button from '../Button';
import {ReactComponent as EyedropperIcon} from '../../assets/icons/eyedropper.svg';
import {HexColorInput, HexColorPicker} from 'react-colorful';
import {MouseEvent, UIEvent, useCallback, useEffect, useRef} from 'react';

declare global {
    interface Window {
        // Experimental API - see https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper
        EyeDropper?: {
            new(): {
                open(): Promise<{sRGBHex: string}>;
            }
        }
    }
}

/** Should usually be used via [ColorPickerField](?path=/docs/global-form-color-picker-field--docs) */
const ColorPicker: React.FC<{
    value?: string;
    eyedropper?: boolean;
    hasTransparentOption?: boolean;
    onChange?: (newValue: string) => void;
    getAccentColor?: () => string;
}> = ({value, eyedropper, hasTransparentOption, onChange, getAccentColor}) => {
    // HexColorInput doesn't support adding a ref on the input itself
    const inputWrapperRef = useRef<HTMLDivElement>(null);

    const stopPropagation = useCallback((e: UIEvent) => {
        e.stopPropagation();

        const inputElement = inputWrapperRef.current?.querySelector('input');
        const isInputField = e.target === inputElement;

        // Allow text selection for events on the input field
        if (isInputField) {
            return;
        }

        // Prevent closing the color picker when clicking somewhere inside it
        inputWrapperRef.current?.querySelector('input')?.focus();

        e.preventDefault();
    }, []);

    const isUsingColorPicker = useRef(false);

    const stopUsingColorPicker = useCallback(() => {
        isUsingColorPicker.current = false;
        inputWrapperRef.current?.querySelector('input')?.focus();

        document.removeEventListener('mouseup', stopUsingColorPicker);
        document.removeEventListener('touchend', stopUsingColorPicker);
    }, []);

    const startUsingColorPicker = useCallback(() => {
        isUsingColorPicker.current = true;

        document.addEventListener('mouseup', stopUsingColorPicker);
        document.addEventListener('touchend', stopUsingColorPicker);
    }, [stopUsingColorPicker]);

    const openColorPicker = useCallback((e: MouseEvent) => {
        e.preventDefault();

        if (!window.EyeDropper) {
            return;
        }

        isUsingColorPicker.current = true;
        document.body.style.setProperty('pointer-events', 'none');

        const eyeDropper = new window.EyeDropper();
        eyeDropper.open()
            .then(result => onChange?.(result.sRGBHex))
            .finally(() => {
                isUsingColorPicker.current = false;
                document.body.style.removeProperty('pointer-events');
                inputWrapperRef.current?.querySelector('input')?.focus();
            });
    }, [onChange]);

    useEffect(() => {
        inputWrapperRef.current?.querySelector('input')?.focus();
    }, []);

    let hexValue = value;
    if (value === 'accent') {
        hexValue = getAccentColor?.() || '';
    } else if (value === 'transparent') {
        hexValue = '';
    }

    const focusHexInputOnClick = useCallback(() => {
        inputWrapperRef.current?.querySelector('input')?.focus();
    }, []);

    return (
        <div className="mt-2" onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
            <HexColorPicker color={hexValue || '#ffffff'} onChange={onChange} onMouseDown={startUsingColorPicker} onTouchStart={startUsingColorPicker} />
            <div className="mt-3 flex gap-2">
                <div ref={inputWrapperRef} className='peer relative order-2 flex h-10 w-full items-center border-b border-grey-500 py-2 hover:border-grey-700 focus:border-black' onClick={focusHexInputOnClick}>
                    <span className='ml-1 mr-2 text-grey-700'>#</span>
                    <HexColorInput aria-label="Color value" className='z-50 w-full bg-transparent' color={hexValue} onChange={onChange} />
                    {eyedropper && !!window.EyeDropper && (
                        <button
                            className="absolute inset-y-0 right-3 z-50 my-auto h-4 w-4 p-[1px]"
                            type="button"
                            onClick={openColorPicker}
                        >
                            <EyedropperIcon className="h-full w-full" />
                        </button>
                    )}
                </div>

                {hasTransparentOption && <Button color='grey' value='Clear' onClick={() => onChange?.('transparent')} />}
            </div>
        </div>
    );
};

export default ColorPicker;
