import {render, fireEvent, getByTestId} from '../../utils/test-utils';
import SigninPage from './SigninPage';
import {getSiteData} from '../../utils/fixtures-generator';

const setup = (overrides) => {
    const {mockDoActionFn, ...utils} = render(
        <SigninPage />,
        {
            overrideContext: {
                member: null,
                ...overrides
            }
        }
    );

    let emailInput;
    let submitButton;
    let signupButton;

    try {
        emailInput = utils.getByLabelText(/email/i);
        submitButton = utils.queryByRole('button', {name: 'Continue'});
        signupButton = utils.queryByRole('button', {name: 'Sign up'});
    } catch (err) {
        // ignore
    }

    return {
        emailInput,
        submitButton,
        signupButton,
        mockDoActionFn,
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
        const {emailInput, submitButton, mockDoActionFn} = setup();

        fireEvent.change(emailInput, {target: {value: 'member@example.com'}});
        expect(emailInput).toHaveValue('member@example.com');

        fireEvent.click(submitButton);
        expect(mockDoActionFn).toHaveBeenCalledWith('signin', {email: 'member@example.com'});
    });

    test('can call swithPage for signup', () => {
        const {signupButton, mockDoActionFn} = setup();

        fireEvent.click(signupButton);
        expect(mockDoActionFn).toHaveBeenCalledWith('switchPage', {page: 'signup'});
    });

    describe('when members are disabled', () => {
        test('renders an informative message', () => {
            setup({
                site: getSiteData({
                    membersSignupAccess: 'none'
                })
            });

            const message = getByTestId(document.body, 'members-disabled-notification-text');
            expect(message).toBeInTheDocument();
        });
    });
});
