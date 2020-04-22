import React from 'react';
import {render, fireEvent} from '@testing-library/react';
import AccountHomePage from './AccountHomePage';
import {site, member} from '../../test/fixtures/data';

const setup = (overrides) => {
    const mockOnActionFn = jest.fn();
    const mockSwitchPageFn = jest.fn();
    const freeMember = member.free;
    const utils = render(
        <AccountHomePage data={{site, member: freeMember}} onAction={mockOnActionFn} switchPage={mockSwitchPageFn} />
    );
    const memberEmail = utils.getByText(member.email);
    const logoutButton = utils.queryByRole('button', {name: 'Logout'});
    return {
        memberEmail,
        logoutButton,
        mockOnActionFn,
        mockSwitchPageFn,
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
