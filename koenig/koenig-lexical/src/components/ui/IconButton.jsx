import React from 'react';
import clsx from 'clsx';

export function IconButton({className, onClick, label, dataTestId, Icon}) {
    return (
        <button
            aria-label={label}
            className={clsx('pointer-events-auto flex h-8 w-9 cursor-pointer items-center justify-center rounded bg-white/90 text-grey-900 transition-all hover:bg-white hover:text-black', className)}
            data-testid={dataTestId}
            type="button"
            onClick={onClick}
        >
            <Icon className="h-4 w-4" />
        </button>
    );
}
