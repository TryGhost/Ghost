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
            <div className={`flex items-start gap-2 ${direction === 'rtl' && 'justify-between'} ${separator && 'pb-2'}`}>
                <input checked={checked}
                    className={`appearance-none rounded-full bg-grey-300 after:absolute after:z-[2] after:ml-0.5 after:mt-0.5 after:rounded-full after:border-none after:bg-white after:transition-[background-color_0.2s,transform_0.2s] after:content-[''] checked:bg-green checked:after:absolute checked:after:z-[2] checked:after:rounded-full checked:after:border-none checked:after:bg-white checked:after:transition-[background-color_0.2s,transform_0.2s] checked:after:content-[''] hover:cursor-pointer focus:outline-none focus:ring-0 focus:after:absolute focus:after:z-[1] focus:after:block focus:after:rounded-full focus:after:content-[''] checked:focus:border-green checked:focus:bg-green dark:bg-grey-600 dark:after:bg-grey-400 dark:checked:bg-green dark:checked:after:bg-green ${sizeStyles} ${direction === 'rtl' && ' order-2'}`}
                    id={id}
                    role="switch"
                    type="checkbox"
                    onChange={onChange} />
                {label && 
                    <div className={`flex flex-col ${direction === 'rtl' && 'order-1'} ${labelStyles}`}>
                        <label
                            className={`inline-block hover:cursor-pointer`}
                            htmlFor={id}
                        >
                            {label}
                        </label>
                        {hint && <span className={`text-xs ${error ? 'text-red' : 'text-grey-700'}`}>{hint}</span>}
                    </div>
                }
            </div>
            {(separator || error) && <Separator color={error ? 'red' : ''} />}
        </div>
    );
};

export default Toggle;