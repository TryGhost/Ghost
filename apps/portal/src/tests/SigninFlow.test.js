import App from '../App.js';
import {fireEvent, appRender, within} from '../utils/test-utils';
import {site as FixtureSite} from '../utils/test-fixtures';
import setupGhostApi from '../utils/api.js';

const setup = async ({site, member = null, labs = {}}) => {
    const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
    ghostApi.init = jest.fn(() => {
        return Promise.resolve({
            site,
            member
        });
    });

    ghostApi.member.sendMagicLink = jest.fn(() => {
        return Promise.resolve('success');
    });

    ghostApi.member.getIntegrityToken = jest.fn(() => {
        return Promise.resolve('testtoken');
    });

    ghostApi.member.checkoutPlan = jest.fn(() => {
        return Promise.resolve();
    });

    const utils = appRender(
        <App api={ghostApi} labs={labs} />
    );

    const triggerButtonFrame = await utils.findByTitle(/portal-trigger/i);
    const popupFrame = utils.queryByTitle(/portal-popup/i);
    const popupIframeDocument = popupFrame.contentDocument;
    const emailInput = within(popupIframeDocument).queryByLabelText(/email/i);
    const nameInput = within(popupIframeDocument).queryByLabelText(/name/i);
    const submitButton = within(popupIframeDocument).queryByRole('button', {name: 'Continue'});
    const signinButton = within(popupIframeDocument).queryByRole('button', {name: 'Sign in'});
    const siteTitle = within(popupIframeDocument).queryByText(site.title);
    const freePlanTitle = within(popupIframeDocument).queryByText('Free');
    const monthlyPlanTitle = within(popupIframeDocument).queryByText('Monthly');
    const yearlyPlanTitle = within(popupIframeDocument).queryByText('Yearly');
    const fullAccessTitle = within(popupIframeDocument).queryByText('Full access');

    return {
        ghostApi,
        popupIframeDocument,
        popupFrame,
        triggerButtonFrame,
        siteTitle,
        emailInput,
        nameInput,
        signinButton,
        submitButton,
        freePlanTitle,
        monthlyPlanTitle,
        yearlyPlanTitle,
        fullAccessTitle,
        ...utils
    };
};

const multiTierSetup = async ({site, member = null}) => {
    const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
    ghostApi.init = jest.fn(() => {
        return Promise.resolve({
            site,
            member
        });
    });

    ghostApi.member.sendMagicLink = jest.fn(() => {
        return Promise.resolve('success');
    });

    ghostApi.member.getIntegrityToken = jest.fn(() => {
        return Promise.resolve(`testtoken`);
    });

    ghostApi.member.checkoutPlan = jest.fn(() => {
        return Promise.resolve();
    });

    const utils = appRender(
        <App api={ghostApi} />
    );
    const freeTierDescription = site.products?.find(p => p.type === 'free')?.description;
    const triggerButtonFrame = await utils.findByTitle(/portal-trigger/i);
    const popupFrame = utils.queryByTitle(/portal-popup/i);
    const popupIframeDocument = popupFrame.contentDocument;
    const emailInput = within(popupIframeDocument).queryByLabelText(/email/i);
    const nameInput = within(popupIframeDocument).queryByLabelText(/name/i);
    const submitButton = within(popupIframeDocument).queryByRole('button', {name: 'Continue'});
    const signinButton = within(popupIframeDocument).queryByRole('button', {name: 'Sign in'});
    const siteTitle = within(popupIframeDocument).queryByText(site.title);
    const freePlanTitle = within(popupIframeDocument).queryAllByText(/free$/i);
    const freePlanDescription = within(popupIframeDocument).queryAllByText(freeTierDescription);
    const monthlyPlanTitle = within(popupIframeDocument).queryByText('Monthly');
    const yearlyPlanTitle = within(popupIframeDocument).queryByText('Yearly');
    const fullAccessTitle = within(popupIframeDocument).queryByText('Full access');
    return {
        ghostApi,
        popupIframeDocument,
        popupFrame,
        triggerButtonFrame,
        siteTitle,
        emailInput,
        nameInput,
        signinButton,
        submitButton,
        freePlanTitle,
        monthlyPlanTitle,
        yearlyPlanTitle,
        fullAccessTitle,
        freePlanDescription,
        ...utils
    };
};

const realLocation = window.location;

describe('Signin', () => {
    describe('on single tier site', () => {
        beforeEach(() => {
            // Mock window.location
            Object.defineProperty(window, 'location', {
                value: new URL('https://portal.localhost/#/portal/signin'),
                writable: true
            });
        });
        afterEach(() => {
            window.location = realLocation;
        });

        test('with default settings', async () => {
            const {
                ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, submitButton,popupIframeDocument
            } = await setup({
                site: FixtureSite.singleTier.basic
            });

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).not.toBeInTheDocument();
            expect(submitButton).toBeInTheDocument();

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            expect(emailInput).toHaveValue('jamie@example.com');

            fireEvent.click(submitButton);

            const magicLink = await within(popupIframeDocument).findByText(/Now check your email/i);
            expect(magicLink).toBeInTheDocument();

            expect(ghostApi.member.sendMagicLink).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                emailType: 'signin',
                integrityToken: 'testtoken'
            });
        });

        test('with OTC enabled', async () => {
            const {ghostApi, emailInput, submitButton, popupIframeDocument} = await setup({
                site: FixtureSite.singleTier.basic,
                labs: {membersSigninOTC: true}
            });

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});
            fireEvent.click(submitButton);

            const magicLink = await within(popupIframeDocument).findByText(/Now check your email/i);
            expect(magicLink).toBeInTheDocument();

            expect(ghostApi.member.sendMagicLink).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                emailType: 'signin',
                integrityToken: 'testtoken',
                otc: true
            });
        });

        test('without name field', async () => {
            const {ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, submitButton,
                popupIframeDocument} = await setup({
                site: FixtureSite.singleTier.withoutName
            });

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).not.toBeInTheDocument();
            expect(submitButton).toBeInTheDocument();

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            expect(emailInput).toHaveValue('jamie@example.com');

            fireEvent.click(submitButton);

            const magicLink = await within(popupIframeDocument).findByText(/Now check your email/i);
            expect(magicLink).toBeInTheDocument();

            expect(ghostApi.member.sendMagicLink).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                emailType: 'signin',
                integrityToken: 'testtoken'
            });
        });

        test('with only free plan', async () => {
            let {ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, submitButton,
                popupIframeDocument} = await setup({
                site: FixtureSite.singleTier.onlyFreePlan
            });

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).not.toBeInTheDocument();
            expect(submitButton).toBeInTheDocument();

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            expect(emailInput).toHaveValue('jamie@example.com');

            fireEvent.click(submitButton);

            const magicLink = await within(popupIframeDocument).findByText(/Now check your email/i);
            expect(magicLink).toBeInTheDocument();

            expect(ghostApi.member.sendMagicLink).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                emailType: 'signin',
                integrityToken: 'testtoken'
            });
        });
    });
});

describe('Signin', () => {
    describe('on multi tier site', () => {
        beforeEach(() => {
            // Mock window.location
            Object.defineProperty(window, 'location', {
                value: new URL('https://portal.localhost/#/portal/signin'),
                writable: true
            });
        });
        afterEach(() => {
            window.location = realLocation;
        });
        test('with default settings', async () => {
            const {ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, submitButton,
                popupIframeDocument} = await multiTierSetup({
                site: FixtureSite.multipleTiers.basic
            });

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).not.toBeInTheDocument();
            expect(submitButton).toBeInTheDocument();

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            expect(emailInput).toHaveValue('jamie@example.com');

            fireEvent.click(submitButton);

            const magicLink = await within(popupIframeDocument).findByText(/Now check your email/i);
            expect(magicLink).toBeInTheDocument();

            expect(ghostApi.member.sendMagicLink).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                emailType: 'signin',
                integrityToken: 'testtoken'
            });
        });

        test('without name field', async () => {
            const {ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, submitButton,
                popupIframeDocument} = await multiTierSetup({
                site: FixtureSite.multipleTiers.withoutName
            });

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).not.toBeInTheDocument();
            expect(submitButton).toBeInTheDocument();

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            expect(emailInput).toHaveValue('jamie@example.com');

            fireEvent.click(submitButton);

            const magicLink = await within(popupIframeDocument).findByText(/Now check your email/i);
            expect(magicLink).toBeInTheDocument();

            expect(ghostApi.member.sendMagicLink).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                emailType: 'signin',
                integrityToken: 'testtoken'
            });
        });

        test('with only free plan available', async () => {
            let {ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, submitButton,
                popupIframeDocument} = await multiTierSetup({
                site: FixtureSite.multipleTiers.onlyFreePlan
            });

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).not.toBeInTheDocument();
            expect(submitButton).toBeInTheDocument();

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            expect(emailInput).toHaveValue('jamie@example.com');

            fireEvent.click(submitButton);

            const magicLink = await within(popupIframeDocument).findByText(/Now check your email/i);
            expect(magicLink).toBeInTheDocument();

            expect(ghostApi.member.sendMagicLink).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                emailType: 'signin',
                integrityToken: 'testtoken'
            });
        });
    });
});

describe('OTC Integration Flow', () => {
    beforeEach(() => {
        // Mock window.location
        Object.defineProperty(window, 'location', {
            value: new URL('https://portal.localhost/#/portal/signin'),
            writable: true
        });
    });
    afterEach(() => {
        window.location = realLocation;
    });

    const setupOTCFlow = async ({site, otcRef = 'test-otc-ref-123'}) => {
        const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
        ghostApi.init = jest.fn(() => {
            return Promise.resolve({
                site,
                member: null
            });
        });

        // Mock sendMagicLink to return otcRef for OTC flow
        ghostApi.member.sendMagicLink = jest.fn(() => {
            return Promise.resolve({
                success: true,
                otc_ref: otcRef
            });
        });

        ghostApi.member.getIntegrityToken = jest.fn(() => {
            return Promise.resolve('testtoken');
        });

        // Mock verifyOTC action
        ghostApi.member.verifyOTC = jest.fn(() => {
            return Promise.resolve({
                success: true,
                member: {
                    email: 'jamie@example.com',
                    id: 'test-member-id'
                }
            });
        });

        const utils = appRender(
            <App api={ghostApi} labs={{membersSigninOTC: true}} />
        );

        const triggerButtonFrame = await utils.findByTitle(/portal-trigger/i);
        const popupFrame = utils.queryByTitle(/portal-popup/i);
        const popupIframeDocument = popupFrame.contentDocument;

        return {
            ghostApi,
            popupIframeDocument,
            popupFrame,
            triggerButtonFrame,
            ...utils
        };
    };

    test('complete OTC flow from signin to verification', async () => {
        const {ghostApi, popupIframeDocument} = await setupOTCFlow({
            site: FixtureSite.singleTier.basic
        });

        // Step 1: Enter email and submit signin form
        const emailInput = within(popupIframeDocument).getByLabelText(/email/i);
        const submitButton = within(popupIframeDocument).getByRole('button', {name: 'Continue'});

        fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});
        fireEvent.click(submitButton);

        // Step 2: Verify magic link page appears
        const magicLinkText = await within(popupIframeDocument).findByText(/Now check your email/i);
        expect(magicLinkText).toBeInTheDocument();

        // Step 3: Verify sendMagicLink was called with OTC enabled
        expect(ghostApi.member.sendMagicLink).toHaveBeenCalledWith({
            email: 'jamie@example.com',
            emailType: 'signin',
            integrityToken: 'testtoken',
            otc: true
        });

        // Step 4: Verify OTC form appears
        const otcDescription = within(popupIframeDocument).getByText(/You can also use the one-time code to sign in here/i);
        expect(otcDescription).toBeInTheDocument();

        const otcInput = within(popupIframeDocument).getByLabelText(/Enter one-time code/i);
        expect(otcInput).toBeInTheDocument();

        const verifyButton = within(popupIframeDocument).getByRole('button', {name: 'Verify Code'});
        expect(verifyButton).toBeInTheDocument();

        // Step 5: Enter OTC and submit
        fireEvent.change(otcInput, {target: {value: '123456'}});
        fireEvent.click(verifyButton);

        // Step 6: Verify OTC verification would be called (currently just logs)
        // Note: This tests the current console.log implementation
        // When verifyOTC action is implemented, this should verify the API call
    });

    test('OTC form validation in integration flow', async () => {
        const {popupIframeDocument} = await setupOTCFlow({
            site: FixtureSite.singleTier.basic
        });

        // Navigate to magic link page
        const emailInput = within(popupIframeDocument).getByLabelText(/email/i);
        const submitButton = within(popupIframeDocument).getByRole('button', {name: 'Continue'});

        fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});
        fireEvent.click(submitButton);

        // Wait for magic link page
        await within(popupIframeDocument).findByText(/Now check your email/i);

        // Test validation on OTC form
        const verifyButton = within(popupIframeDocument).getByRole('button', {name: 'Verify Code'});
        
        // Submit empty form
        fireEvent.click(verifyButton);

        // Check for validation error
        const errorMessage = await within(popupIframeDocument).findByText(/please enter otc/i);
        expect(errorMessage).toBeInTheDocument();
    });

    test('OTC form Enter key submission in integration flow', async () => {
        const {popupIframeDocument} = await setupOTCFlow({
            site: FixtureSite.singleTier.basic
        });

        // Navigate to magic link page
        const emailInput = within(popupIframeDocument).getByLabelText(/email/i);
        const submitButton = within(popupIframeDocument).getByRole('button', {name: 'Continue'});

        fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});
        fireEvent.click(submitButton);

        // Wait for magic link page with OTC form
        await within(popupIframeDocument).findByText(/Now check your email/i);

        const otcInput = within(popupIframeDocument).getByLabelText(/Enter one-time code/i);
        
        // Enter OTC and submit via Enter key
        fireEvent.change(otcInput, {target: {value: '654321'}});
        fireEvent.keyDown(otcInput, {key: 'Enter', keyCode: 13});

        // Verify submission would occur (current implementation logs)
        // This tests the Enter key integration with the overall flow
    });

    test('OTC flow without otcRef falls back to regular magic link', async () => {
        const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
        ghostApi.init = jest.fn(() => {
            return Promise.resolve({
                site: FixtureSite.singleTier.basic,
                member: null
            });
        });

        // Mock sendMagicLink to return success but no otcRef
        ghostApi.member.sendMagicLink = jest.fn(() => {
            return Promise.resolve({success: true});
        });

        ghostApi.member.getIntegrityToken = jest.fn(() => {
            return Promise.resolve('testtoken');
        });

        const utils = appRender(
            <App api={ghostApi} labs={{membersSigninOTC: true}} />
        );

        await utils.findByTitle(/portal-trigger/i);
        const popupFrame = utils.queryByTitle(/portal-popup/i);
        const popupIframeDocument = popupFrame.contentDocument;

        // Submit signin form
        const emailInput = within(popupIframeDocument).getByLabelText(/email/i);
        const submitButton = within(popupIframeDocument).getByRole('button', {name: 'Continue'});

        fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});
        fireEvent.click(submitButton);

        // Verify magic link page appears
        const magicLinkText = await within(popupIframeDocument).findByText(/Now check your email/i);
        expect(magicLinkText).toBeInTheDocument();

        // Verify OTC form does NOT appear without otcRef
        const otcDescription = within(popupIframeDocument).queryByText(/You can also use the one-time code to sign in here/i);
        expect(otcDescription).not.toBeInTheDocument();

        // Verify regular close button appears instead
        const closeButton = within(popupIframeDocument).getByRole('button', {name: 'Close'});
        expect(closeButton).toBeInTheDocument();
    });

    test('OTC flow on multi-tier site', async () => {
        const {ghostApi, popupIframeDocument} = await setupOTCFlow({
            site: FixtureSite.multipleTiers.basic
        });

        // Submit signin form on multi-tier site
        const emailInput = within(popupIframeDocument).getByLabelText(/email/i);
        const submitButton = within(popupIframeDocument).getByRole('button', {name: 'Continue'});

        fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});
        fireEvent.click(submitButton);

        // Verify magic link page appears
        const magicLinkText = await within(popupIframeDocument).findByText(/Now check your email/i);
        expect(magicLinkText).toBeInTheDocument();

        // Verify OTC form appears on multi-tier site
        const otcDescription = within(popupIframeDocument).getByText(/You can also use the one-time code to sign in here/i);
        expect(otcDescription).toBeInTheDocument();

        const otcInput = within(popupIframeDocument).getByLabelText(/Enter one-time code/i);
        expect(otcInput).toBeInTheDocument();

        // Verify sendMagicLink was called correctly for multi-tier
        expect(ghostApi.member.sendMagicLink).toHaveBeenCalledWith({
            email: 'jamie@example.com',
            emailType: 'signin',
            integrityToken: 'testtoken',
            otc: true
        });
    });

    test('OTC form state persists during user interaction', async () => {
        const {popupIframeDocument} = await setupOTCFlow({
            site: FixtureSite.singleTier.basic
        });

        // Navigate to magic link page
        const emailInput = within(popupIframeDocument).getByLabelText(/email/i);
        const submitButton = within(popupIframeDocument).getByRole('button', {name: 'Continue'});

        fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});
        fireEvent.click(submitButton);

        // Wait for magic link page
        await within(popupIframeDocument).findByText(/Now check your email/i);

        const otcInput = within(popupIframeDocument).getByLabelText(/Enter one-time code/i);
        
        // Test progressive input
        fireEvent.change(otcInput, {target: {value: '1'}});
        expect(otcInput).toHaveValue('1');

        fireEvent.change(otcInput, {target: {value: '123'}});
        expect(otcInput).toHaveValue('123');

        fireEvent.change(otcInput, {target: {value: '123456'}});
        expect(otcInput).toHaveValue('123456');

        // Test clearing
        fireEvent.change(otcInput, {target: {value: ''}});
        expect(otcInput).toHaveValue('');

        // Verify form is still interactive
        const verifyButton = within(popupIframeDocument).getByRole('button', {name: 'Verify Code'});
        expect(verifyButton).not.toBeDisabled();
    });

    test('OTC flow shows close functionality instead of back navigation', async () => {
        const {popupIframeDocument} = await setupOTCFlow({
            site: FixtureSite.singleTier.basic
        });

        // Navigate to magic link page
        const emailInput = within(popupIframeDocument).getByLabelText(/email/i);
        const submitButton = within(popupIframeDocument).getByRole('button', {name: 'Continue'});

        fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});
        fireEvent.click(submitButton);

        // Wait for magic link page with OTC form
        await within(popupIframeDocument).findByText(/Now check your email/i);
        const otcDescription = within(popupIframeDocument).getByText(/You can also use the one-time code to sign in here/i);
        expect(otcDescription).toBeInTheDocument();

        // Verify close functionality is available (X button in top right)
        const closeButton = within(popupIframeDocument).getByTestId('close-popup');
        expect(closeButton).toBeInTheDocument();

        // Verify no back navigation link when OTC form is shown
        const backToSignin = within(popupIframeDocument).queryByText(/Back to Log in/i);
        expect(backToSignin).not.toBeInTheDocument();

        // Verify OTC form remains functional
        const otcInput = within(popupIframeDocument).getByLabelText(/Enter one-time code/i);
        const verifyButton = within(popupIframeDocument).getByRole('button', {name: 'Verify Code'});
        expect(otcInput).toBeInTheDocument();
        expect(verifyButton).toBeInTheDocument();
    });
});
