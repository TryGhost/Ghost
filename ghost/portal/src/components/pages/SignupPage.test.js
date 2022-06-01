import React from 'react';
import SignupPage from './SignupPage';
import {render, fireEvent} from '../../utils/test-utils';

const setup = (overrides) => {
    const {mockOnActionFn, ...utils} = render(
        <SignupPage />,
        {
            overrideContext: {
                member: null
            }
        }
    );
    const emailInput = utils.getByLabelText(/email/i);
    const nameInput = utils.getByLabelText(/name/i);
    const submitButton = utils.queryByRole('button', {name: 'Continue'});
    const chooseButton = utils.queryAllByRole('button', {name: 'Choose'});
    const signinButton = utils.queryByRole('button', {name: 'Sign in'});
    return {
        nameInput,
        emailInput,
        submitButton,
        chooseButton,
        signinButton,
        mockOnActionFn,
        ...utils
    };
};

describe('SignupPage', () => {
    test('renders', () => {
        const {nameInput, emailInput, queryAllByRole, signinButton} = setup();
        const chooseButton = queryAllByRole('button', {name: 'Continue'});

        expect(nameInput).toBeInTheDocument();
        expect(emailInput).toBeInTheDocument();
        expect(chooseButton).toHaveLength(1);
        expect(signinButton).toBeInTheDocument();
    });

    test('can call signup action with name, email and plan', () => {
        const {nameInput, emailInput, chooseButton, mockOnActionFn} = setup();
        const nameVal = 'J Smith';
        const emailVal = 'jsmith@example.com';
        const planVal = 'free';

        fireEvent.change(nameInput, {target: {value: nameVal}});
        fireEvent.change(emailInput, {target: {value: emailVal}});
        expect(nameInput).toHaveValue(nameVal);
        expect(emailInput).toHaveValue(emailVal);

        fireEvent.click(chooseButton[0]);
        expect(mockOnActionFn).toHaveBeenCalledWith('signup', {email: emailVal, name: nameVal, plan: planVal});
    });

    test('can call swithPage for signin', () => {
        const {signinButton, mockOnActionFn} = setup();

        fireEvent.click(signinButton);
        expect(mockOnActionFn).toHaveBeenCalledWith('switchPage', {page: 'signin'});
    });
});
