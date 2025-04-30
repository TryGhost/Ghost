import {getFreeProduct, getProductData, getSiteData} from '../../utils/fixtures-generator';
import {render, fireEvent, getByTestId, queryByTestId} from '../../utils/test-utils';
import SignupPage from './SignupPage';

const setup = (overrides) => {
    const {mockOnActionFn, ...utils} = render(
        <SignupPage />,
        {
            overrideContext: {
                member: null,
                ...overrides
            }
        }
    );

    let emailInput;
    let nameInput;
    let submitButton;
    let chooseButton;
    let signinButton;
    let freeTrialMessage;

    try {
        emailInput = utils.getByLabelText(/email/i);
        nameInput = utils.getByLabelText(/name/i);
        submitButton = utils.queryByRole('button', {name: 'Continue'});
        chooseButton = utils.queryAllByRole('button', {name: 'Choose'});
        signinButton = utils.queryByRole('button', {name: 'Sign in'});
        freeTrialMessage = utils.queryByText(/After a free trial ends/i);
    } catch (err) {
        // ignore
    }

    return {
        nameInput,
        emailInput,
        submitButton,
        chooseButton,
        signinButton,
        freeTrialMessage,
        mockOnActionFn,
        ...utils
    };
};

describe('SignupPage', () => {
    test('renders', () => {
        const {nameInput, emailInput, queryAllByRole, signinButton} = setup();
        const chooseButton = queryAllByRole('button', {name: 'Continue'});

        expect(nameInput).toBeInTheDocument();
        expect(emailInput).toBeInTheDocument();
        expect(chooseButton).toHaveLength(1);
        expect(signinButton).toBeInTheDocument();
    });

    test('can call signup action with name, email and plan', () => {
        const {nameInput, emailInput, chooseButton, mockOnActionFn} = setup();
        const nameVal = 'J Smith';
        const emailVal = 'jsmith@example.com';
        const planVal = 'free';

        fireEvent.change(nameInput, {target: {value: nameVal}});
        fireEvent.change(emailInput, {target: {value: emailVal}});
        expect(nameInput).toHaveValue(nameVal);
        expect(emailInput).toHaveValue(emailVal);

        fireEvent.click(chooseButton[0]);
        expect(mockOnActionFn).toHaveBeenCalledWith('signup', {email: emailVal, name: nameVal, plan: planVal});
    });

    test('can call swithPage for signin', () => {
        const {signinButton, mockOnActionFn} = setup();

        fireEvent.click(signinButton);
        expect(mockOnActionFn).toHaveBeenCalledWith('switchPage', {page: 'signin'});
    });

    test('renders free trial message', () => {
        const {freeTrialMessage} = setup({
            site: getSiteData({
                products: [
                    getProductData({trialDays: 7}),
                    getFreeProduct({})
                ]
            })
        });

        expect(freeTrialMessage).toBeInTheDocument();
    });

    test('does not render free trial message on free signup', () => {
        const {freeTrialMessage} = setup({
            site: getSiteData({
                products: [
                    getProductData({trialDays: 7}),
                    getFreeProduct({})
                ]
            }),
            pageQuery: 'free'
        });

        expect(freeTrialMessage).not.toBeInTheDocument();
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

    describe('when site is invite-only', () => {
        test('blocks signups but offers to sign in', () => {
            setup({
                site: getSiteData({
                    membersSignupAccess: 'invite'
                })
            });

            const message = getByTestId(document.body, 'invite-only-notification-text');
            expect(message).toBeInTheDocument();

            const signinLink = getByTestId(document.body, 'signin-switch');
            expect(signinLink).toBeInTheDocument();
        });
    });

    describe('when site is paid-members only', () => {
        test('blocks the #/portal/signup/free page, but offers to sign in', () => {
            setup({
                site: getSiteData({
                    membersSignupAccess: 'paid'
                }),
                pageQuery: 'free'
            });

            const message = getByTestId(document.body, 'paid-members-only-notification-text');
            expect(message).toBeInTheDocument();

            const signinLink = getByTestId(document.body, 'signin-switch');
            expect(signinLink).toBeInTheDocument();
        });

        test('blocks signups when only the free plan is available, but offers to sign in', () => {
            setup({
                site: getSiteData({
                    membersSignupAccess: 'paid',
                    products: [getFreeProduct({})]
                })
            });

            const message = getByTestId(document.body, 'invite-only-notification-text');
            expect(message).toBeInTheDocument();

            const signinLink = getByTestId(document.body, 'signin-switch');
            expect(signinLink).toBeInTheDocument();
        });

        test('blocks signups when no plans are available, but offers to sign in', () => {
            setup({
                site: getSiteData({
                    membersSignupAccess: 'paid',
                    products: []
                })
            });

            const message = getByTestId(document.body, 'invite-only-notification-text');
            expect(message).toBeInTheDocument();

            const signinLink = getByTestId(document.body, 'signin-switch');
            expect(signinLink).toBeInTheDocument();
        });
    });

    describe('when site has memberships disabled', () => {
        test('blocks signups and signins', () => {
            setup({
                site: getSiteData({
                    membersSignupAccess: 'none'
                })
            });

            const message = getByTestId(document.body, 'members-disabled-notification-text');
            expect(message).toBeInTheDocument();

            const signinLink = queryByTestId(document.body, 'signin-switch');
            expect(signinLink).toBeNull();
        });
    });

    describe('when site is anyone-can-signup, but has no available prices', () => {
        test('blocks signups, but allows signins', () => {
            setup({
                site: getSiteData({
                    membersSignupAccess: 'all',
                    products: [],
                    portalPlans: []
                })
            });

            const message = getByTestId(document.body, 'invite-only-notification-text');
            expect(message).toBeInTheDocument();

            const signinLink = getByTestId(document.body, 'signin-switch');
            expect(signinLink).toBeInTheDocument();
        });
    });
});
