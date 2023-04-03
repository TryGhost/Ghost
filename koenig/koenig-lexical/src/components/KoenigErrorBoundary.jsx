import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {ErrorBoundary as ReactErrorBoundary} from 'react-error-boundary';

export default function KoenigErrorBoundary({children}) {
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
