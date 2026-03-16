import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {ErrorBoundary as ReactErrorBoundary} from 'react-error-boundary';

interface KoenigErrorBoundaryProps {
    children: React.ReactNode;
}

export default function KoenigErrorBoundary({children}: KoenigErrorBoundaryProps) {
    const {onError} = React.useContext(KoenigComposerContext);

    return (
        <ReactErrorBoundary
            fallback={<div className="border border-red p-2">An error was thrown.</div>}
            onError={onError}
        >
            {children}
        </ReactErrorBoundary>
    );
}
