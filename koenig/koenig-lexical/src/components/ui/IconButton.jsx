import React from 'react';

export function IconButton({onClick, label, dataTestID, Icon}) {
    return (
        <button
            type="button"
            className="flex h-8 w-9 cursor-pointer items-center justify-center rounded bg-white/90 transition-all hover:bg-white"
            onClick={onClick}
            aria-label={label}
            data-testid={dataTestID}
        >
            <Icon className="h-5 w-5 fill-grey-900" />
        </button>
    );
}