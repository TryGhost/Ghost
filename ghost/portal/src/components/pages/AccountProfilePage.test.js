import React from 'react';
import {render, fireEvent} from '../../utils/test-utils';
import AccountProfilePage from './AccountProfilePage';

const setup = (overrides) => {
    const {mockOnActionFn, context, ...utils} = render(
        <AccountProfilePage />
    );
    const emailInputEl = utils.getByLabelText(/email/i);
    const nameInputEl = utils.getByLabelText(/name/i);
    const saveBtn = utils.queryByRole('button', {name: 'Save'});
    return {
        emailInputEl,
        nameInputEl,
        saveBtn,
        mockOnActionFn,
        context,
        ...utils
    };
};

describe('Account Profile Page', () => {
    test('renders', () => {
        const {emailInputEl, nameInputEl, saveBtn} = setup();

        expect(emailInputEl).toBeInTheDocument();
        expect(nameInputEl).toBeInTheDocument();
        expect(saveBtn).toBeInTheDocument();
    });

    test('can call save', () => {
        const {mockOnActionFn, saveBtn, context} = setup();

        fireEvent.click(saveBtn);
        const {email, name} = context.member;
        expect(mockOnActionFn).toHaveBeenCalledWith('updateProfile', {email, name});
    });
});
