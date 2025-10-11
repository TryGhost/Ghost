import {render, fireEvent} from '../../utils/test-utils';
import EmailSuppressedPage from './EmailSuppressedPage';

const setup = () => {
    const {mockDoActionFn, ...utils} = render(
        <EmailSuppressedPage />
    );
    const resubscribeBtn = utils.queryByRole('button', {name: 'Re-enable emails'});
    const title = utils.queryByText('Emails disabled');

    return {
        resubscribeBtn,
        title,
        mockDoActionFn,
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
        const {mockDoActionFn, resubscribeBtn} = setup();

        fireEvent.click(resubscribeBtn);
        expect(mockDoActionFn).toHaveBeenCalledWith('removeEmailFromSuppressionList');
    });
});
