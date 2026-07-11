import {render, fireEvent} from '../../../utils/test-utils';
import AccountProfilePage from '../../../../src/components/pages/account-profile-page';

const setup = (overrides = {}) => {
    const {mockDoActionFn, context, ...utils} = render(
        <AccountProfilePage />,
        {
            overrideContext: {
                ...overrides
            }
        }
    );
    const emailInputEl = utils.getByLabelText(/email/i);
    const nameInputEl = utils.getByLabelText(/name/i);
    const saveBtn = utils.queryByRole('button', {name: 'Save'});
    return {
        emailInputEl,
        nameInputEl,
        saveBtn,
        mockDoActionFn,
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
        const {mockDoActionFn, saveBtn, context} = setup();

        fireEvent.click(saveBtn);
        const {email, name} = context.member;
        expect(mockDoActionFn).toHaveBeenCalledWith('updateProfile', {email, name});
    });

    test('orders Back before Close in keyboard navigation', () => {
        const {getByRole} = setup({lastPage: 'accountHome'});

        const backBtn = getByRole('button', {name: 'Back'});
        const closeBtn = getByRole('button', {name: 'Close popup'});

        expect(backBtn.compareDocumentPosition(closeBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    test('uses the accent color for Back and Close', () => {
        const {getByRole, getByTestId} = setup({
            brandColor: '#ff0099',
            lastPage: 'accountHome'
        });

        const backBtn = getByRole('button', {name: 'Back'});
        const closeIcon = getByTestId('close-popup').querySelector('.gh-portal-closeicon');

        expect(backBtn).toHaveStyle({color: '#ff0099'});
        expect(closeIcon).toHaveStyle({color: '#ff0099'});
    });
});
