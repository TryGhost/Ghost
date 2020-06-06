// Common test setup util - Ref: https://testing-library.com/docs/react-testing-library/setup#custom-render
import React from 'react';
import {render} from '@testing-library/react';
import {ParentContext} from '../components/ParentContext';
import {site, member} from './fixtures';

const setupProvider = (context) => {
    return ({children}) => {
        return (
            <ParentContext.Provider value={context}>
                {children}
            </ParentContext.Provider>
        );
    };
};

const customRender = (ui, {options = {}, overrideContext = {}} = {}) => {
    const mockOnActionFn = jest.fn();

    const context = {
        site,
        member: member.free,
        action: 'init:success',
        brandColor: site.brand.primaryColor,
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