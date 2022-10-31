import React from 'react';
import {render, fireEvent} from '../../utils/test-utils';
import SigninPage from './SigninPage';

const setup = (overrides) => {
    const {mockOnActionFn, ...utils} = render(
        <SigninPage />,
        {
            overrideContext: {
                member: null
            }
        }
    );
    const emailInput = utils.getByLabelText(/email/i);
    const submitButton = utils.queryByRole('button', {name: 'Continue'});
    const signupButton = utils.queryByRole('button', {name: 'Sign up'});
    return {
        emailInput,
        submitButton,
        signupButton,
        mockOnActionFn,
        ...utils
    };
};

describe('SigninPage', () => {
    test('renders', () => {
        const {emailInput, submitButton, signupButton} = setup();

        expect(emailInput).toBeInTheDocument();
        expect(submitButton).toBeInTheDocument();
        expect(signupButton).toBeInTheDocument();
    });

    test('can call signin action with email', () => {
        const {emailInput, submitButton, mockOnActionFn} = setup();

        fireEvent.change(emailInput, {target: {value: 'member@example.com'}});
        expect(emailInput).toHaveValue('member@example.com');

        fireEvent.click(submitButton);
        expect(mockOnActionFn).toHaveBeenCalledWith('signin', {email: 'member@example.com'});
    });

    test('can call swithPage for signup', () => {
        const {signupButton, mockOnActionFn} = setup();

        fireEvent.click(signupButton);
        expect(mockOnActionFn).toHaveBeenCalledWith('switchPage', {page: 'signup'});
    });
});
