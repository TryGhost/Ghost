import React from 'react';
import {render, fireEvent} from '@testing-library/react';
import SignedInPage from './SignedInPage';
import {site, member} from '../test/fixtures/data';

const setup = (overrides) => {
    const mockOnActionFn = jest.fn();
    const mockSwitchPageFn = jest.fn();

    const utils = render(
        <SignedInPage data={{site, member}} onAction={mockOnActionFn} switchPage={mockSwitchPageFn} />
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

describe('SignedInPage', () => {
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
