import PropTypes from 'prop-types';
import React from 'react';

import {usePreviousFocus} from '../../hooks/usePreviousFocus';

export function ButtonGroup({buttons = [], selectedName, onClick}) {
    return (
        <div className="flex">
            <ul className="flex items-center justify-evenly rounded bg-grey-100 font-sans text-md font-normal text-white dark:bg-black">
                {buttons.map(({label, name, Icon, dataTestId}) => (
                    <IconButton
                        key={`${name}-${label}`}
                        dataTestId={dataTestId}
                        Icon={Icon}
                        label={label}
                        name={name}
                        selectedName={selectedName}
                        onClick={onClick}
                    />
                ))}
            </ul>
        </div>
    );
}

export function IconButton({dataTestId, onClick, label, name, selectedName, Icon}) {
    const isActive = name === selectedName;

    const {handleMousedown, handleClick} = usePreviousFocus(onClick, name);

    return (
        <li className="mb-0">
            <button
                aria-label={label}
                className={`m-[3px] flex h-7 w-8 cursor-pointer items-center justify-center ${isActive ? 'rounded bg-white text-black shadow-sm dark:bg-grey-900 dark:text-white' : 'text-grey-700 dark:text-white' } ${Icon || 'text-[1.3rem] font-bold'}`}
                data-testid={dataTestId}
                type="button"
                onClick={handleClick}
                onMouseDown={handleMousedown}
            >
                {Icon ? <Icon className="h-4 w-4 fill-black dark:fill-white" /> : label}
            </button>
        </li>
    );
}

ButtonGroup.propTypes = {
    selectedName: PropTypes.oneOf(['regular', 'wide', 'full', 'split', 'center', 'left', 'small', 'medium', 'large'])
};
