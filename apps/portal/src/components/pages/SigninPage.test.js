import {render, fireEvent, getByTestId} from '../../utils/test-utils';
import SigninPage from './SigninPage';
import {getSiteData} from '../../utils/fixtures-generator';

const setup = (overrides) => {
    const {mockOnActionFn, ...utils} = render(
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
        mockOnActionFn,
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
        const {signupButton, mockOnActionFn} = setup();

        fireEvent.click(signupButton);
        expect(mockOnActionFn).toHaveBeenCalledWith('switchPage', {page: 'signup'});
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
