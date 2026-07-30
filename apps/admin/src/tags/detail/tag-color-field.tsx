import React from 'react';
import {Input, Label} from '@tryghost/shade/components';

interface TagColorFieldProps {
    value: string;
    disabled?: boolean;
    onChange: (color: string) => void;
    onError: (message: string | null) => void;
}

const HEX_COLOR_REGEX = /#[0-9A-Fa-f]{6}$/;

/**
 * The tag accent colour control: a hex text input (no leading `#`) plus a
 * native colour picker swatch, porting Ember `tag-form.js`
 * `updateAccentColor` / `debounceUpdateAccentColorTask` — the same 10ms
 * debounce on input, immediate normalization on blur, and the same error
 * copy for a malformed hex value.
 */
const TagColorField: React.FC<TagColorFieldProps> = ({value, disabled, onChange, onError}) => {
    const [text, setText] = React.useState(value.replace(/^#/, ''));
    const lastValueRef = React.useRef(value);
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Adopt external changes (initial load, a background refetch) without
    // clobbering in-progress typing on unrelated re-renders.
    React.useEffect(() => {
        if (value !== lastValueRef.current) {
            lastValueRef.current = value;
            setText(value.replace(/^#/, ''));
        }
    }, [value]);

    React.useEffect(() => () => clearTimeout(debounceRef.current), []);

    const applyColor = (input: string) => {
        onError(null);

        if (input === '') {
            if (value !== '') {
                lastValueRef.current = '';
                onChange('');
            }
            return;
        }

        let newColor = input;
        if (newColor[0] !== '#') {
            newColor = `#${newColor}`;
        }

        if (HEX_COLOR_REGEX.test(newColor)) {
            if (newColor === value) {
                return;
            }
            lastValueRef.current = newColor;
            setText(newColor.replace(/^#/, ''));
            onChange(newColor);
        } else {
            onError('The colour should be in valid hex format');
        }
    };

    const scheduleApply = (input: string) => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => applyColor(input), 10);
    };

    return (
        <div className='flex flex-col gap-1.5'>
            <Label htmlFor='tag-accent-color'>Color</Label>
            <div className='flex items-center gap-2'>
                <Input
                    aria-label='Accent color hex value'
                    autoCorrect='off'
                    disabled={disabled}
                    id='tag-accent-color'
                    maxLength={6}
                    placeholder='15171A'
                    value={text}
                    onBlur={e => applyColor(e.target.value)}
                    onChange={(e) => {
                        setText(e.target.value);
                        scheduleApply(e.target.value);
                    }}
                />
                <div
                    className='relative size-9 shrink-0 overflow-hidden rounded-md border border-input'
                    style={{backgroundColor: value || '#ffffff'}}
                >
                    <input
                        aria-label='Accent color picker'
                        className='absolute inset-0 size-full cursor-pointer opacity-0'
                        disabled={disabled}
                        type='color'
                        value={value || '#ffffff'}
                        onChange={(e) => {
                            setText(e.target.value.replace(/^#/, ''));
                            scheduleApply(e.target.value);
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default TagColorField;
