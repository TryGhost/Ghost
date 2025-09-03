import App from '../App.js';
import {fireEvent, appRender, within} from '../utils/test-utils';
import {site as FixtureSite} from '../utils/test-fixtures';
import setupGhostApi from '../utils/api.js';

const OTC_LABEL_REGEX = /Code/i;

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
                includeOTC: true
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

    describe('redirect parameter handling', () => {
        afterEach(() => {
            window.location = realLocation;
        });

        // Helper function to open location and complete signin flow
        async function openLocationAndCompleteSigninFlow() {
            const {ghostApi, popupIframeDocument, emailInput, submitButton} = await setup({
                site: FixtureSite.singleTier.basic,
                member: null // No member to trigger signin requirement
            });

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});
            fireEvent.click(submitButton);

            const magicLink = await within(popupIframeDocument).findByText(/Now check your email/i);
            expect(magicLink).toBeInTheDocument();

            return {ghostApi, popupIframeDocument};
        }

        test('passes redirect parameter to sendMagicLink when pageData.redirect is set', async () => {
            // Mock the window.location to simulate feedback URL that sets redirect
            Object.defineProperty(window, 'location', {
                value: new URL('https://portal.localhost/#/feedback/12345/1'),
                writable: true
            });

            // opens /#/feedback/12345/1 which redirects to /#/signin,
            // setting pageData.redirect in the process
            const {ghostApi} = await openLocationAndCompleteSigninFlow();

            expect(ghostApi.member.sendMagicLink).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    // redirect parameter contains original feedback URL not current URL
                    redirect: expect.stringContaining('#/feedback/12345/1')
                })
            );
        });

        test('redirect parameter is not passed to sendMagicLink when pageData.redirect is not set', async () => {
            // Reset location to regular signin URL so there's no explicit setting of pageData.redirect
            Object.defineProperty(window, 'location', {
                value: new URL('https://portal.localhost/#/portal/signin'),
                writable: true
            });

            const {ghostApi} = await openLocationAndCompleteSigninFlow();

            // Verify redirect is not included in the sendMagicLink call
            const lastCall = ghostApi.member.sendMagicLink.mock.calls[ghostApi.member.sendMagicLink.mock.calls.length - 1][0];
            expect(lastCall.redirect).toBeUndefined();
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

    const setupOTCFlow = async ({site, otcRef = 'test-otc-ref-123', returnOtcRef = true}) => {
        const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
        ghostApi.init = jest.fn(() => {
            return Promise.resolve({
                site,
                member: null
            });
        });

        // Mock sendMagicLink to return otcRef for OTC flow or fallback
        ghostApi.member.sendMagicLink = jest.fn(() => {
            return returnOtcRef
                ? Promise.resolve({success: true, otc_ref: otcRef})
                : Promise.resolve({success: true});
        });

        ghostApi.member.getIntegrityToken = jest.fn(() => {
            return Promise.resolve('testtoken');
        });

        // Mock verifyOTC action
        // @TODO: update when this is implemented
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

        await utils.findByTitle(/portal-trigger/i);
        const popupFrame = utils.queryByTitle(/portal-popup/i);
        const popupIframeDocument = popupFrame.contentDocument;

        return {
            ghostApi,
            popupIframeDocument,
            popupFrame,
            ...utils
        };
    };

    const performCompleteOTCFlow = async (popupIframeDocument, email = 'jamie@example.com') => {
        const emailInput = within(popupIframeDocument).getByLabelText(/email/i);
        const submitButton = within(popupIframeDocument).getByRole('button', {name: 'Continue'});

        fireEvent.change(emailInput, {target: {value: email}});
        fireEvent.click(submitButton);

        const magicLinkText = await within(popupIframeDocument).findByText(/Now check your email/i);
        return {magicLinkText};
    };

    const expectOTCEnabledApiCall = (ghostApi, email) => {
        expect(ghostApi.member.sendMagicLink).toHaveBeenCalledWith({
            email,
            emailType: 'signin',
            integrityToken: 'testtoken',
            includeOTC: true
        });
    };

    test('complete OTC flow from signin to verification', async () => {
        const {ghostApi, popupIframeDocument} = await setupOTCFlow({
            site: FixtureSite.singleTier.basic
        });

        const {magicLinkText} = await performCompleteOTCFlow(popupIframeDocument, 'jamie@example.com');

        expect(magicLinkText).toBeInTheDocument();
        expectOTCEnabledApiCall(ghostApi, 'jamie@example.com');
        expect(ghostApi.member.sendMagicLink).toHaveBeenCalledTimes(1);

        const otcInput = within(popupIframeDocument).getByLabelText(OTC_LABEL_REGEX);
        const verifyButton = within(popupIframeDocument).getByRole('button', {name: 'Continue'});

        expect(otcInput).toBeInTheDocument();
        expect(verifyButton).toBeInTheDocument();

        fireEvent.change(otcInput, {target: {value: '123456'}});
        fireEvent.click(verifyButton);

        // assert form submission occurs (currently via console.log)
        // note: When verifyOTC action is implemented, this should verify the API call
    });

    test('OTC flow without otcRef falls back to regular magic link', async () => {
        const {ghostApi, popupIframeDocument} = await setupOTCFlow({
            site: FixtureSite.singleTier.basic,
            returnOtcRef: false
        });

        const {magicLinkText} = await performCompleteOTCFlow(popupIframeDocument, 'jamie@example.com');

        expect(magicLinkText).toBeInTheDocument();
        expectOTCEnabledApiCall(ghostApi, 'jamie@example.com');
        expect(ghostApi.member.sendMagicLink).toHaveBeenCalledTimes(1);

        const otcInput = within(popupIframeDocument).queryByLabelText(OTC_LABEL_REGEX);
        expect(otcInput).not.toBeInTheDocument();

        const closeButton = within(popupIframeDocument).getByRole('button', {name: 'Close'});
        expect(closeButton).toBeInTheDocument();
    });

    test('OTC flow on multi-tier site', async () => {
        const {ghostApi, popupIframeDocument} = await setupOTCFlow({
            site: FixtureSite.multipleTiers.basic
        });

        const {magicLinkText} = await performCompleteOTCFlow(popupIframeDocument, 'jamie@example.com');

        expect(magicLinkText).toBeInTheDocument();
        expectOTCEnabledApiCall(ghostApi, 'jamie@example.com');

        const otcInput = within(popupIframeDocument).getByLabelText(OTC_LABEL_REGEX);

        expect(otcInput).toBeInTheDocument();
    });
});
