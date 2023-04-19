import React from 'react';

import PropTypes from 'prop-types';

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
    return (
        <li className="mb-0">
            <button
                aria-label={label}
                className={`m-[3px] flex h-7 w-8 cursor-pointer items-center justify-center ${isActive ? 'rounded bg-white text-black shadow-sm dark:bg-grey-900 dark:text-white' : 'text-grey-700 dark:text-white' } ${Icon || 'text-[1.3rem] font-bold'}`}
                data-testid={dataTestId}
                type="button"
                onClick={() => onClick(name)}
            >
                {Icon ? <Icon className="fill-black dark:fill-white" /> : label}
            </button>
        </li>
    );
}

ButtonGroup.propTypes = {
    selectedName: PropTypes.oneOf(['regular', 'wide', 'full', 'center', 'left', 'small', 'medium', 'large'])
};
