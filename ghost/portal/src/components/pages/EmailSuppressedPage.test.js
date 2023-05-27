import React from 'react';
import {render, fireEvent} from '../../utils/test-utils';
import EmailSuppressedPage from './EmailSuppressedPage';

const setup = (overrides) => {
    const {mockOnActionFn, ...utils} = render(
        <EmailSuppressedPage />
    );
    const resubscribeBtn = utils.queryByRole('button', {name: 'Re-enable emails'});
    const title = utils.queryByText('Emails disabled');

    return {
        resubscribeBtn,
        title,
        mockOnActionFn,
        ...utils
    };
};

describe('Email Suppressed Page', () => {
    test('renders', () => {
        const {resubscribeBtn, title} = setup();
        expect(title).toBeInTheDocument();
        expect(resubscribeBtn).toBeInTheDocument();
    });

    test('can call resubscribe button', () => {
        const {mockOnActionFn, resubscribeBtn} = setup();

        fireEvent.click(resubscribeBtn);
        expect(mockOnActionFn).toHaveBeenCalledWith('removeEmailFromSuppressionList');
    });
});
