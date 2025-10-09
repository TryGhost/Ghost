// Common test setup util - Ref: https://testing-library.com/docs/react-testing-library/setup#custom-render
import {render} from '@testing-library/react';
import AppContext from '../AppContext';
import {testSite, member} from './fixtures';

const setupProvider = (context) => {
    const Provider = ({children}) => {
        return (
            <AppContext.Provider value={context}>
                {children}
            </AppContext.Provider>
        );
    };
    Provider.displayName = 'AppContextProvider';
    return Provider;
};

const customRender = (ui, {options = {}, overrideContext = {}} = {}) => {
    const mockDoActionFn = vi.fn().mockResolvedValue(undefined);

    // Hardcode the locale to 'en' for testing
    const {t} = require('@tryghost/i18n')('en');

    const context = {
        site: testSite,
        member: member.free,
        action: 'init:success',
        brandColor: testSite.accent_color,
        page: 'signup',
        doAction: mockDoActionFn,
        t,
        ...overrideContext
    };
    const utils = render(ui, {wrapper: setupProvider(context), ...options});
    return {
        ...utils,
        context,
        mockDoActionFn
    };
};

export const appRender = (ui, {options = {}} = {}) => {
    const mockDoActionFn = vi.fn();

    const utils = render(ui, options);
    return {
        ...utils,
        mockDoActionFn
    };
};

// re-export everything
export * from '@testing-library/react';

// override render method
export {customRender as render};
