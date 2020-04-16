import React from 'react';
import {render} from '@testing-library/react';
import SignedInPage from './SignedInPage';
import {site, member} from '../test/fixtures/data';

describe('SignedInPage', () => {
    test('renders', () => {
        const {getByText} = render(
            <SignedInPage data={{site, member}} onAction={() => {}} switchPage={() => {}} />
        );

        const memberEmail = getByText(member.email);
        const logoutButton = getByText(/logout/i);

        expect(memberEmail).toBeInTheDocument();
        expect(logoutButton).toBeInTheDocument();
    });
});
