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
    const mockOnActionFn = jest.fn().mockResolvedValue(undefined);

    // Hardcode the locale to 'en' for testing
    const {t} = require('@tryghost/i18n')('en');

    const context = {
        site: testSite,
        member: member.free,
        action: 'init:success',
        brandColor: testSite.accent_color,
        page: 'signup',
        onAction: mockOnActionFn,
        t,
        ...overrideContext
    };
    const utils = render(ui, {wrapper: setupProvider(context), ...options});
    return {
        ...utils,
        context,
        mockOnActionFn
    };
};

export const appRender = (ui, {options = {}} = {}) => {
    const mockOnActionFn = jest.fn();

    const utils = render(ui, options);
    return {
        ...utils,
        mockOnActionFn
    };
};

// re-export everything
export * from '@testing-library/react';

// override render method
export {customRender as render};
