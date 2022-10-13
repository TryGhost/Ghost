import React from 'react';
import {render, fireEvent} from '../../utils/test-utils';
import AccountHomePage from './AccountHomePage';

const setup = (overrides) => {
    const {mockOnActionFn, ...utils} = render(
        <AccountHomePage />
    );
    const logoutBtn = utils.queryByRole('button', {name: 'logout'});
    return {
        logoutBtn,
        mockOnActionFn,
        ...utils
    };
};

describe('Account Home Page', () => {
    test('renders', () => {
        const {logoutBtn} = setup();
        expect(logoutBtn).toBeInTheDocument();
    });

    test('can call signout', () => {
        const {mockOnActionFn, logoutBtn} = setup();

        fireEvent.click(logoutBtn);
        expect(mockOnActionFn).toHaveBeenCalledWith('signout');
    });
});
