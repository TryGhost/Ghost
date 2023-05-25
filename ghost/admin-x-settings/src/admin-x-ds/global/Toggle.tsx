import React from 'react';
import Separator from './Separator';

type ToggleSizes = 'sm' | 'md' | 'lg';
type ToggleDirections = 'ltr' | 'rtl';

interface ToggleProps {
    id: string;
    color?: string;
    checked?: boolean;
    disabled?: boolean;
    error?: boolean;
    size?: ToggleSizes;
    label?: React.ReactNode;
    separator?: boolean;
    direction?: ToggleDirections;
    hint?: React.ReactNode;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Toggle: React.FC<ToggleProps> = ({id, size, direction, label, hint, separator, error, checked, onChange}) => {
    let sizeStyles = '';
    let labelStyles = '';
    switch (size) {
    case 'sm':
        sizeStyles = ' h-3 w-5 after:h-2 after:w-2 checked:after:ml-[1.0rem]';
        labelStyles = 'mt-[-5.5px]';
        break;

    case 'lg':
        sizeStyles = ' h-5 w-8 after:h-4 after:w-4 checked:after:ml-[1.4rem]';
        labelStyles = 'mt-[-1px]';
        break;

    default:
        sizeStyles = ' min-w-[28px] h-4 w-7 after:h-3 after:w-3 checked:after:ml-[1.4rem]';
        labelStyles = 'mt-[-3px]';
        break;
    }

    return (
        <div>
            <div className={`group flex items-start gap-2 ${direction === 'rtl' && 'justify-between'} ${separator && 'pb-2'}`}>
                <input checked={checked}
                    className={`appearance-none rounded-full bg-grey-300 transition after:absolute after:ml-0.5 after:mt-0.5 after:rounded-full after:border-none after:bg-white after:transition-[background-color_0.2s,transform_0.2s] after:content-[''] checked:bg-green checked:after:absolute checked:after:rounded-full checked:after:border-none checked:after:bg-white checked:after:transition-[background-color_0.2s,transform_0.2s] checked:after:content-[''] hover:cursor-pointer group-hover:bg-grey-400 checked:group-hover:bg-green-600 ${sizeStyles} ${direction === 'rtl' && ' order-2'}`}
                    id={id}
                    role="switch"
                    type="checkbox"
                    onChange={onChange} />
                {label &&
                    <label className={`flex flex-col hover:cursor-pointer ${direction === 'rtl' && 'order-1'} ${labelStyles}`} htmlFor={id}>
                        <span>{label}</span>
                        {hint && <span className={`text-xs ${error ? 'text-red' : 'text-grey-700'}`}>{hint}</span>}
                    </label>
                }
            </div>
            {(separator || error) && <Separator color={error ? 'red' : ''} />}
        </div>
    );
};

export default Toggle;