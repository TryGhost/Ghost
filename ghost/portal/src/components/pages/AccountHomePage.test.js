import React from 'react';
import {render, fireEvent} from '../../utils/tests';
import AccountHomePage from './AccountHomePage';
import {member} from '../../test/fixtures/data';

const setup = (overrides) => {
    const freeMember = member.free;
    const {mockOnActionFn, ...utils} = render(
        <AccountHomePage />
    );
    const memberEmail = utils.getByText(freeMember.email);
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
