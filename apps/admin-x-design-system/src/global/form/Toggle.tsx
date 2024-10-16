import clsx from 'clsx';
import React, {useId} from 'react';
import {Heading6StylesGrey} from '../Heading';
import Separator from '../Separator';
import * as TogglePrimitive from '@radix-ui/react-switch';

type ToggleSizes = 'sm' | 'md' | 'lg';
export type ToggleDirections = 'ltr' | 'rtl';

export interface ToggleProps {
    checked?: boolean;
    disabled?: boolean;
    name?: string;
    error?: boolean;
    size?: ToggleSizes;
    label?: React.ReactNode;
    labelStyle?: 'heading' | 'value';
    labelClasses?: string;
    toggleBg?: 'green' | 'black' | 'stripetest';
    separator?: boolean;
    direction?: ToggleDirections;
    hint?: React.ReactNode;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Toggle: React.FC<ToggleProps> = ({
    size,
    direction,
    label,
    labelStyle = 'value',
    labelClasses,
    toggleBg = 'black',
    hint,
    separator,
    error,
    checked,
    disabled,
    name,
    onChange
}) => {
    const id = useId();

    let sizeStyles = '';
    let thumbSizeStyles = '';
    let labelStyles = '';
    switch (size) {
    case 'sm':
        sizeStyles = ' h-3 w-5';
        thumbSizeStyles = ' h-2 w-2 data-[state=checked]:translate-x-[10px]';
        labelStyles = 'mt-[-5.5px]';
        break;

    case 'lg':
        sizeStyles = ' h-5 w-8';
        thumbSizeStyles = ' h-4 w-4 data-[state=checked]:translate-x-[14px]';
        labelStyles = 'mt-[-1px]';
        break;

    default:
        sizeStyles = ' min-w-[28px] h-4 w-7';
        thumbSizeStyles = ' h-3 w-3 data-[state=checked]:translate-x-[14px]';
        labelStyles = 'mt-[-3px]';
        break;
    }

    labelStyles = clsx(
        labelClasses,
        labelStyles
    );

    if (labelStyle === 'heading') {
        direction = 'rtl';
    }

    let toggleBgClass;
    switch (toggleBg) {
    case 'stripetest':
        toggleBgClass = 'data-[state=checked]:bg-[#EC6803] dark:data-[state=checked]:bg-[#EC6803]';
        break;

    case 'green':
        toggleBgClass = 'data-[state=checked]:bg-green';
        break;

    default:
        toggleBgClass = 'data-[state=checked]:bg-black dark:data-[state=checked]:bg-green';
        break;
    }

    const handleCheckedChange = (isChecked: boolean) => {
        if (onChange) {
            const event = {
                target: {checked: isChecked}
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(event);
        }
    };

    return (
        <div>
            <div className={`group flex items-start gap-2 dark:text-white ${direction === 'rtl' && 'justify-between'} ${separator && 'pb-2'}`}>
                <TogglePrimitive.Root className={clsx(
                    toggleBgClass,
                    'appearance-none rounded-full bg-grey-300 transition duration-100 dark:bg-grey-800',
                    'enabled:hover:cursor-pointer disabled:opacity-40 enabled:group-hover:opacity-80',
                    sizeStyles,
                    direction === 'rtl' && ' order-2'
                )} defaultChecked={checked} disabled={disabled} id={id} name={name} onCheckedChange={handleCheckedChange}>
                    <TogglePrimitive.Thumb className={clsx(
                        thumbSizeStyles,
                        'block translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform'
                    )} />
                </TogglePrimitive.Root>
                {label &&
                    <label className={`flex grow flex-col hover:cursor-pointer ${direction === 'rtl' && 'order-1'} ${labelStyles}`} htmlFor={id}>
                        {
                            labelStyle === 'heading' ?
                                <span className={`${Heading6StylesGrey} mt-1`}>{label}</span>
                                :
                                <span>{label}</span>
                        }
                        {hint && <span className={`text-xs ${error ? 'text-red' : 'text-grey-700 dark:text-grey-600'}`}>{hint}</span>}
                    </label>
                }
            </div>
            {(separator || error) && <Separator className={error ? 'border-red' : ''} />}
        </div>
    );
};

export default Toggle;
