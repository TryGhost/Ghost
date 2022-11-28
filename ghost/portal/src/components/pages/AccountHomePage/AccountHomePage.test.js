import React from 'react';
import {render, fireEvent} from 'utils/test-utils';
import AccountHomePage from './AccountHomePage';
import {member} from 'utils/test-fixtures';
import {site} from 'utils/fixtures';

const setup = (overrides) => {
    const {mockOnActionFn, ...utils} = render(
        <AccountHomePage />,
        {
            overrideContext: {
                ...overrides
            }
        }
    );
    const logoutBtn = utils.queryByRole('button', {name: 'logout'});
    return {
        logoutBtn,
        mockOnActionFn,
        utils
    };
};

describe('Account Home Page', () => {
    test('renders', () => {
        const {logoutBtn, utils} = setup();
        expect(logoutBtn).toBeInTheDocument();
        expect(utils.queryByText('You\'re currently not receiving emails')).not.toBeInTheDocument();
        expect(utils.queryByText('Email newsletter')).toBeInTheDocument();
    });

    test('can call signout', () => {
        const {mockOnActionFn, logoutBtn} = setup();

        fireEvent.click(logoutBtn);
        expect(mockOnActionFn).toHaveBeenCalledWith('signout');
    });

    test('can show suppressed info', () => {
        const {mockOnActionFn, utils} = setup({member: member.suppressed});

        expect(utils.queryByText('You\'re currently not receiving emails')).toBeInTheDocument();

        const manageBtn = utils.queryByRole('button', {name: 'Manage'});
        expect(manageBtn).toBeInTheDocument();

        fireEvent.click(manageBtn);
        expect(mockOnActionFn).toHaveBeenCalledWith('switchPage', {lastPage: 'accountHome', page: 'emailSuppressed'});
    });

    test('can show Manage button for few newsletters', () => {
        const {mockOnActionFn, utils} = setup({site: site});

        expect(utils.queryByText('Update your preferences')).toBeInTheDocument();
        expect(utils.queryByText('You\'re currently not receiving emails')).not.toBeInTheDocument();

        const manageBtn = utils.queryByRole('button', {name: 'Manage'});
        expect(manageBtn).toBeInTheDocument();

        fireEvent.click(manageBtn);
        expect(mockOnActionFn).toHaveBeenCalledWith('switchPage', {lastPage: 'accountHome', page: 'accountEmail'});
    });
});
