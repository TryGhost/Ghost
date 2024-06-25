import React from 'react';
import clsx from 'clsx';
import {Tooltip} from './Tooltip';

export function IconButton({className, onClick, label, dataTestId, Icon}) {
    return (
        <button
            aria-label={label}
            className={clsx('group pointer-events-auto relative flex h-8 w-9 cursor-pointer items-center justify-center rounded-md bg-white/90 text-grey-900 transition-all hover:bg-white hover:text-black', className)}
            data-testid={dataTestId}
            type="button"
            onClick={onClick}
        >
            <Icon className="size-4 stroke-2" />
            {label && <Tooltip label={label} />}
        </button>
    );
}
