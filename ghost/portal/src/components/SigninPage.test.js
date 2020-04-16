import React from 'react';
import {render, fireEvent} from '@testing-library/react';
import SigninPage from './SigninPage';
import {site} from '../test/fixtures/data';

const setup = (overrides) => {
    const mockOnActionFn = jest.fn();
    const mockSwitchPageFn = jest.fn();

    const utils = render(
        <SigninPage data={{site}} onAction={mockOnActionFn} switchPage={mockSwitchPageFn} />
    );
    const emailInput = utils.getByLabelText(/email/i);
    const submitButton = utils.queryByRole('button', {name: 'Send Login Link'});
    const signupButton = utils.queryByRole('button', {name: 'Subscribe'});
    return {
        emailInput,
        submitButton,
        signupButton,
        mockOnActionFn,
        mockSwitchPageFn,
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
        const {signupButton, mockSwitchPageFn} = setup();

        fireEvent.click(signupButton);
        expect(mockSwitchPageFn).toHaveBeenCalledWith('signup');
    });
});
