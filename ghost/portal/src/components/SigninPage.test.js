import React from 'react';
import {render} from '@testing-library/react';
import SigninPage from './SigninPage';
import {site} from '../test/fixtures/data';

describe('SigninPage', () => {
    test('renders', () => {
        const {getByPlaceholderText, getByText} = render(
            <SigninPage data={{site}} onAction={() => {}} switchPage={() => {}} />
        );
        const emailInput = getByPlaceholderText(/email/i);
        const submitButton = getByText(/continue/i);
        const signupButton = getByText(/Signup/i);

        expect(emailInput).toBeInTheDocument();
        expect(submitButton).toBeInTheDocument();
        expect(signupButton).toBeInTheDocument();
    });
});
