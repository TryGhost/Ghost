import React, {ReactElement} from 'react';
import {render, RenderOptions} from '@testing-library/react';

// Global HTML typings needed for tests
declare global {
    // eslint-disable-next-line no-unused-vars
    interface HTMLElement {
        className: string;
    }
}

// Add any providers that components need wrapped around them for testing
function AllTheProviders({children}: {children: React.ReactNode}) {
    return (
        <>
            {children}
        </>
    );
}

const customRender = (
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, {wrapper: AllTheProviders, ...options});

// re-export everything
export * from '@testing-library/react';

// override render method
export {customRender as render}; 