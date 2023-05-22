import React from 'react';
import clsx from 'clsx';

export function IconButton({className, onClick, label, dataTestId, Icon}) {
    return (
        <button
            aria-label={label}
            className={clsx('pointer-events-auto flex h-8 w-9 cursor-pointer items-center justify-center rounded bg-white/90 transition-all hover:bg-white', className)}
            data-testid={dataTestId}
            type="button"
            onClick={onClick}
        >
            <Icon className="h-5 w-5 fill-grey-900" />
        </button>
    );
}
