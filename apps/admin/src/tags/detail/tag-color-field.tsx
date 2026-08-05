import React from 'react';
import {InputGroup, InputGroupAddon, InputGroupInput, InputGroupText, Label} from '@tryghost/shade/components';

interface TagColorFieldProps {
    value: string;
    disabled?: boolean;
    errorId?: string;
    onChange: (color: string) => void;
    onError: (message: string | null) => void;
}

const HEX_COLOR_REGEX = /#[0-9A-Fa-f]{6}$/;

/**
 * The tag accent colour control, arranged like Ember's `.input-color`: one
 * bordered control with the swatch (the native colour-picker trigger) on the
 * left, a static `#` prefix, and the hex text input. Ports `tag-form.js`
 * `updateAccentColor` — immediate normalization keeps the form draft in sync
 * before keyboard saves, with the same error copy for a malformed hex value.
 */
const TagColorField: React.FC<TagColorFieldProps> = ({value, disabled, errorId, onChange, onError}) => {
    const [text, setText] = React.useState(value.replace(/^#/, ''));
    const lastValueRef = React.useRef(value);

    // Adopt external changes (initial load, a background refetch) without
    // clobbering in-progress typing on unrelated re-renders.
    React.useEffect(() => {
        if (value !== lastValueRef.current) {
            lastValueRef.current = value;
            setText(value.replace(/^#/, ''));
        }
    }, [value]);

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

    return (
        <div className='flex flex-col gap-1.5'>
            <Label htmlFor='tag-accent-color'>Color</Label>
            <InputGroup className='w-36' data-disabled={disabled ? 'true' : undefined}>
                <InputGroupAddon align='inline-start'>
                    <div
                        className='relative size-6 shrink-0 overflow-hidden rounded-sm border border-border'
                        style={{backgroundColor: value || '#ffffff'}}
                        // Keep the addon's focus-the-text-input click handler
                        // from hijacking the native colour-picker trigger.
                        onClick={e => e.stopPropagation()}
                    >
                        <input
                            aria-label='Accent color picker'
                            className='absolute inset-0 size-full cursor-pointer opacity-0'
                            disabled={disabled}
                            type='color'
                            value={value || '#ffffff'}
                            onChange={(e) => {
                                setText(e.target.value.replace(/^#/, ''));
                                applyColor(e.target.value);
                            }}
                        />
                    </div>
                    <InputGroupText className='font-mono'>#</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                    aria-describedby={errorId}
                    aria-invalid={!!errorId}
                    aria-label='Accent color hex value'
                    autoCorrect='off'
                    className='font-mono'
                    disabled={disabled}
                    id='tag-accent-color'
                    maxLength={6}
                    placeholder='15171A'
                    value={text}
                    onBlur={e => applyColor(e.target.value)}
                    onChange={(e) => {
                        setText(e.target.value);
                        applyColor(e.target.value);
                    }}
                />
            </InputGroup>
        </div>
    );
};

export default TagColorField;
