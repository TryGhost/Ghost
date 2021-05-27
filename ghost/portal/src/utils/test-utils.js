// Common test setup util - Ref: https://testing-library.com/docs/react-testing-library/setup#custom-render
import React from 'react';
import {render} from '@testing-library/react';
import AppContext from '../AppContext';
import {testSite, member} from './fixtures';

const setupProvider = (context) => {
    return ({children}) => {
        return (
            <AppContext.Provider value={context}>
                {children}
            </AppContext.Provider>
        );
    };
};

const customRender = (ui, {options = {}, overrideContext = {}} = {}) => {
    const mockOnActionFn = jest.fn();

    const context = {
        site: testSite,
        member: member.free,
        action: 'init:success',
        brandColor: testSite.accent_color,
        page: 'signup',
        onAction: mockOnActionFn,
        ...overrideContext
    };
    const utils = render(ui, {wrapper: setupProvider(context), ...options});
    return {
        ...utils,
        context,
        mockOnActionFn
    };
};

// re-export everything
export * from '@testing-library/react';

// override render method
export {customRender as render};
