import React from 'react';
import {render, fireEvent} from 'test-utils';
import AccountHomePage from './AccountHomePage';

const setup = (overrides) => {
    const {mockOnActionFn, ...utils} = render(
        <AccountHomePage />
    );
    const logoutBtn = utils.queryByRole('button', {name: 'Logout'});
    const settingsBtn = utils.queryByRole('button', {name: 'Settings'});
    return {
        logoutBtn,
        settingsBtn,
        mockOnActionFn,
        ...utils
    };
};

describe('Account Home Page', () => {
    test('renders', () => {
        const {settingsBtn, logoutBtn} = setup();

        expect(settingsBtn).toBeInTheDocument();
        expect(logoutBtn).toBeInTheDocument();
    });

    test('can call signout', () => {
        const {mockOnActionFn, logoutBtn} = setup();

        fireEvent.click(logoutBtn);
        expect(mockOnActionFn).toHaveBeenCalledWith('signout');
    });
});
