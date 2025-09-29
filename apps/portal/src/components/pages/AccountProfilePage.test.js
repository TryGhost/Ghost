import {render, fireEvent} from '../../utils/test-utils';
import AccountProfilePage from './AccountProfilePage';

const setup = () => {
    const {mockDoActionFn, context, ...utils} = render(
        <AccountProfilePage />
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
});
