import React from 'react';
import {render, fireEvent} from 'test-utils';
import AccountHomePage from './AccountHomePage';

const setup = (overrides) => {
    const {mockOnActionFn, ...utils} = render(
        <AccountHomePage />
    );
    const memberEmail = utils.getByText('member@example.com');
    const logoutButton = utils.queryByRole('button', {name: 'Log out'});
    return {
        memberEmail,
        logoutButton,
        mockOnActionFn,
        ...utils
    };
};

describe('Account Home Page', () => {
    test('renders', () => {
        const {memberEmail, logoutButton} = setup();

        expect(memberEmail).toBeInTheDocument();
        expect(logoutButton).toBeInTheDocument();
    });

    test('can call signout', () => {
        const {mockOnActionFn, logoutButton} = setup();

        fireEvent.click(logoutButton);
        expect(mockOnActionFn).toHaveBeenCalledWith('signout');
    });
});
