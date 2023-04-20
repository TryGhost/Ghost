import React from 'react';

export function IconButton({onClick, label, dataTestId, Icon}) {
    return (
        <button
            aria-label={label}
            className="pointer-events-auto flex h-8 w-9 cursor-pointer items-center justify-center rounded bg-white/90 transition-all hover:bg-white"
            data-testid={dataTestId}
            type="button"
            onClick={onClick}
        >
            <Icon className="h-5 w-5 fill-grey-900" />
        </button>
    );
}
