import React from 'react';
import {render} from '@testing-library/react';
import MagicLinkPage from './MagicLinkPage';

describe('MagicLinkPage', () => {
    test('renders', () => {
        const {getByText} = render(
            <MagicLinkPage />
        );

        const inboxText = getByText(/check your inbox/i);

        expect(inboxText).toBeInTheDocument();
    });
});
