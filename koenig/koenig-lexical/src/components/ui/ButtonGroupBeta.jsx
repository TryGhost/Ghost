import PropTypes from 'prop-types';
import React from 'react';

import {Tooltip} from './Tooltip';
import {usePreviousFocus} from '../../hooks/usePreviousFocus';

export function ButtonGroupBeta({buttons = [], selectedName, onClick, hasTooltip = true}) {
    return (
        <div className="flex">
            <ul className="flex items-center justify-evenly rounded-lg bg-grey-100 font-sans text-md font-normal text-white" role="menubar">
                {buttons.map(({label, name, Icon, dataTestId, ariaLabel}) => (
                    <ButtonGroupIconButton
                        key={`${name}-${label}`}
                        ariaLabel={ariaLabel}
                        dataTestId={dataTestId}
                        hasTooltip={hasTooltip}
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

export function ButtonGroupIconButton({dataTestId, onClick, label, ariaLabel, name, selectedName, Icon, hasTooltip}) {
    const isActive = name === selectedName;

    const {handleMousedown, handleClick} = usePreviousFocus(onClick, name);

    return (
        <li className="mb-0">
            <button
                aria-checked={isActive}
                aria-label={ariaLabel || label}
                className={`group relative flex h-7 w-8 cursor-pointer items-center justify-center rounded-lg text-black dark:text-white dark:hover:bg-grey-900 ${isActive ? 'border border-grey-300 bg-white shadow-xs dark:bg-grey-900' : '' } ${Icon ? '' : 'text-[1.3rem] font-bold'}`}
                data-testid={dataTestId}
                role="menuitemradio"
                type="button"
                onClick={handleClick}
                onMouseDown={handleMousedown}
            >
                {Icon ? <Icon className="size-4 stroke-2" /> : label}
                {(Icon && label && hasTooltip) && <Tooltip label={label} />}
            </button>
        </li>
    );
}

ButtonGroupBeta.propTypes = {
    selectedName: PropTypes.oneOf(['regular', 'wide', 'full', 'split', 'center', 'left', 'small', 'medium', 'large', 'grid', 'list', 'minimal', 'immersive']).isRequired,
    hasTooltip: PropTypes.bool,
    onClick: PropTypes.func.isRequired,
    buttons: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string,
        name: PropTypes.string.isRequired,
        Icon: PropTypes.elementType,
        dataTestId: PropTypes.string,
        ariaLabel: PropTypes.string
    }))
};
