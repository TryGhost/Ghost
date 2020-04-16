import React from 'react';
import {render} from '@testing-library/react';
import SignupPage from './SignupPage';
import {site} from '../test/fixtures/data';

describe('SignupPage', () => {
    test('renders', () => {
        const {getByPlaceholderText, getByText} = render(
            <SignupPage data={{site}} onAction={() => {}} switchPage={() => {}} />
        );
        const nameInput = getByPlaceholderText(/name/i);
        const emailInput = getByPlaceholderText(/email/i);
        const submitButton = getByText(/continue/i);
        const loginButton = getByText(/log in/i);

        expect(nameInput).toBeInTheDocument();
        expect(emailInput).toBeInTheDocument();
        expect(submitButton).toBeInTheDocument();
        expect(loginButton).toBeInTheDocument();
    });
});
