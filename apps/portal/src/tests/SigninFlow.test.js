import App from '../App.js';
import {fireEvent, appRender, within, waitFor} from '../utils/test-utils';
import {site as FixtureSite} from '../utils/test-fixtures';
import setupGhostApi from '../utils/api.js';

const OTC_LABEL_REGEX = /Code/i;

const setup = async ({site, member = null, labs = {}}) => {
    const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
    ghostApi.init = vi.fn(() => {
        return Promise.resolve({
            site,
            member
        });
    });

    ghostApi.member.sendMagicLink = vi.fn(() => {
        return Promise.resolve('success');
    });

    ghostApi.member.getIntegrityToken = vi.fn(() => {
        return Promise.resolve('testtoken');
    });

    ghostApi.member.checkoutPlan = vi.fn(() => {
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
    ghostApi.init = vi.fn(() => {
        return Promise.resolve({
            site,
            member
        });
    });

    ghostApi.member.sendMagicLink = vi.fn(() => {
        return Promise.resolve('success');
    });

    ghostApi.member.getIntegrityToken = vi.fn(() => {
        return Promise.resolve(`testtoken`);
    });

    ghostApi.member.checkoutPlan = vi.fn(() => {
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

// Helper function to verify OTC-enabled API calls
const expectOTCEnabledSendMagicLinkAPICall = (ghostApi, email) => {
    expect(ghostApi.member.sendMagicLink).toHaveBeenCalledWith({
        email,
        emailType: 'signin',
        integrityToken: 'testtoken',
        includeOTC: true
    });
};

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

            // Mock sendMagicLink to return otc_ref for OTC flow
            ghostApi.member.sendMagicLink = vi.fn(() => {
                return Promise.resolve({success: true, otc_ref: 'test-otc-ref-123'});
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
            const description = await within(popupIframeDocument).findByText(/An email has been sent to jamie@example.com/i);
            expect(description).toBeInTheDocument();

            expectOTCEnabledSendMagicLinkAPICall(ghostApi, 'jamie@example.com');
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

            expectOTCEnabledSendMagicLinkAPICall(ghostApi, 'jamie@example.com');
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

            expectOTCEnabledSendMagicLinkAPICall(ghostApi, 'jamie@example.com');
        });
    });
});

describe('Signin', () => {
    afterEach(() => {
        window.location = realLocation;
    });

    describe('on multi tier site', () => {
        beforeEach(() => {
            // Mock window.location
            Object.defineProperty(window, 'location', {
                value: new URL('https://portal.localhost/#/portal/signin'),
                writable: true
            });
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

            expectOTCEnabledSendMagicLinkAPICall(ghostApi, 'jamie@example.com');
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

            expectOTCEnabledSendMagicLinkAPICall(ghostApi, 'jamie@example.com');
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

            expectOTCEnabledSendMagicLinkAPICall(ghostApi, 'jamie@example.com');
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
    const locationAssignMock = vi.fn();

    beforeEach(() => {
        const mockLocation = new URL('https://portal.localhost/#/portal/signin');
        mockLocation.assign = locationAssignMock;
        Object.defineProperty(window, 'location', {
            value: mockLocation,
            writable: true
        });
    });

    afterEach(() => {
        window.location = realLocation;
        vi.restoreAllMocks();
        locationAssignMock.mockReset();
    });

    const setupOTCFlow = async ({site, otcRef = 'test-otc-ref-123', returnOtcRef = true}) => {
        const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
        ghostApi.init = vi.fn(() => {
            return Promise.resolve({
                site,
                member: null
            });
        });

        // Mock sendMagicLink to return otcRef for OTC flow or fallback
        ghostApi.member.sendMagicLink = vi.fn(() => {
            return returnOtcRef
                ? Promise.resolve({success: true, otc_ref: otcRef})
                : Promise.resolve({success: true});
        });

        ghostApi.member.getIntegrityToken = vi.fn(() => {
            return Promise.resolve('testtoken');
        });

        ghostApi.member.verifyOTC = vi.fn(() => {
            return Promise.resolve({
                redirectUrl: 'https://example.com/welcome'
            });
        });

        const utils = appRender(
            <App api={ghostApi} labs={{}} />
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

    const submitSigninForm = async (popupIframeDocument, email = 'jamie@example.com') => {
        const emailInput = within(popupIframeDocument).getByLabelText(/email/i);
        const submitButton = within(popupIframeDocument).getByRole('button', {name: 'Continue'});

        fireEvent.change(emailInput, {target: {value: email}});
        fireEvent.click(submitButton);

        const magicLinkText = await within(popupIframeDocument).findByText(/Now check your email/i);
        expect(magicLinkText).toBeInTheDocument();
    };

    const submitOTCForm = (popupIframeDocument, code = '123456') => {
        const otcInput = within(popupIframeDocument).getByLabelText(OTC_LABEL_REGEX);
        const verifyButton = within(popupIframeDocument).getByRole('button', {name: 'Continue'});

        fireEvent.change(otcInput, {target: {value: code}});
        fireEvent.click(verifyButton);
    };

    test('complete OTC flow from signin to verification', async () => {
        const {ghostApi, popupIframeDocument} = await setupOTCFlow({
            site: FixtureSite.singleTier.basic
        });

        await submitSigninForm(popupIframeDocument, 'jamie@example.com');

        expectOTCEnabledSendMagicLinkAPICall(ghostApi, 'jamie@example.com');
        expect(ghostApi.member.sendMagicLink).toHaveBeenCalledTimes(1);

        submitOTCForm(popupIframeDocument, '123456');

        await waitFor(() => {
            expect(ghostApi.member.verifyOTC).toHaveBeenCalledWith({
                otc: '123456',
                otcRef: 'test-otc-ref-123',
                integrityToken: 'testtoken',
                redirect: undefined
            });
        });

        expect(ghostApi.member.verifyOTC).toHaveBeenCalledTimes(1);
        expect(locationAssignMock).toHaveBeenCalledWith('https://example.com/welcome');
        expect(locationAssignMock).toHaveBeenCalledTimes(1);
    });

    test('OTC flow without otcRef falls back to regular magic link', async () => {
        const {ghostApi, popupIframeDocument} = await setupOTCFlow({
            site: FixtureSite.singleTier.basic,
            returnOtcRef: false
        });

        await submitSigninForm(popupIframeDocument, 'jamie@example.com');

        expectOTCEnabledSendMagicLinkAPICall(ghostApi, 'jamie@example.com');
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

        await submitSigninForm(popupIframeDocument, 'jamie@example.com');

        expectOTCEnabledSendMagicLinkAPICall(ghostApi, 'jamie@example.com');

        const otcInput = within(popupIframeDocument).getByLabelText(OTC_LABEL_REGEX);

        expect(otcInput).toBeInTheDocument();
    });

    test('MagicLink description shows submitted email on OTC flow', async () => {
        const {popupIframeDocument} = await setupOTCFlow({
            site: FixtureSite.singleTier.basic
        });

        await submitSigninForm(popupIframeDocument, 'jamie@example.com');

        const description = await within(popupIframeDocument).findByText(/An email has been sent to jamie@example.com/i);
        expect(description).toBeInTheDocument();
    });

    test('OTC verification with invalid code shows error', async () => {
        const {ghostApi, popupIframeDocument} = await setupOTCFlow({
            site: FixtureSite.singleTier.basic
        });

        // Mock verifyOTC to return validation error
        ghostApi.member.verifyOTC.mockRejectedValueOnce(new Error('Invalid verification code'));

        await submitSigninForm(popupIframeDocument, 'jamie@example.com');
        submitOTCForm(popupIframeDocument, '000000');

        await waitFor(() => {
            expect(ghostApi.member.verifyOTC).toHaveBeenCalledWith({
                otc: '000000',
                otcRef: 'test-otc-ref-123',
                redirect: undefined,
                integrityToken: 'testtoken'
            });
        });

        const errorNotification = await within(popupIframeDocument).findByText(/Invalid verification code/i);
        expect(errorNotification).toBeInTheDocument();
    });

    test('OTC verification without redirectUrl shows default error', async () => {
        const {ghostApi, popupIframeDocument} = await setupOTCFlow({
            site: FixtureSite.singleTier.basic
        });

        ghostApi.member.verifyOTC.mockResolvedValueOnce({});

        await submitSigninForm(popupIframeDocument, 'jamie@example.com');
        submitOTCForm(popupIframeDocument, '654321');

        await waitFor(() => {
            expect(ghostApi.member.verifyOTC).toHaveBeenCalledWith({
                otc: '654321',
                otcRef: 'test-otc-ref-123',
                redirect: undefined,
                integrityToken: 'testtoken'
            });
        });

        const errorNotification = await within(popupIframeDocument).findByText(/Failed to verify code/i);
        expect(errorNotification).toBeInTheDocument();
    });

    test('OTC verification with API error shows error message', async () => {
        const {ghostApi, popupIframeDocument} = await setupOTCFlow({
            site: FixtureSite.singleTier.basic
        });

        // Mock verifyOTC to throw API error
        ghostApi.member.verifyOTC.mockRejectedValueOnce(new Error('Network error'));

        await submitSigninForm(popupIframeDocument, 'jamie@example.com');
        submitOTCForm(popupIframeDocument, '123456');

        await waitFor(() => {
            expect(ghostApi.member.verifyOTC).toHaveBeenCalledWith({
                otc: '123456',
                otcRef: 'test-otc-ref-123',
                redirect: undefined,
                integrityToken: 'testtoken'
            });
        });

        const errorNotification = await within(popupIframeDocument).findByText(/Failed to verify code, please try again/i);
        expect(errorNotification).toBeInTheDocument();
    });

    describe('OTC redirect parameter handling', () => {
        test('passes redirect parameter from pageData to verifyOTC', async () => {
            Object.defineProperty(window, 'location', {
                value: new URL('https://portal.localhost/#/feedback/12345/1'),
                writable: true
            });

            const {ghostApi, popupIframeDocument} = await setupOTCFlow({
                site: FixtureSite.singleTier.basic
            });

            await submitSigninForm(popupIframeDocument, 'jamie@example.com');
            submitOTCForm(popupIframeDocument, '123456');

            await waitFor(() => {
                expect(ghostApi.member.verifyOTC).toHaveBeenCalledWith({
                    otc: '123456',
                    otcRef: 'test-otc-ref-123',
                    redirect: expect.stringContaining('#/feedback/12345/1'),
                    integrityToken: 'testtoken'
                });
            });
        });

        test('verifyOTC works without redirect parameter', async () => {
            const {ghostApi, popupIframeDocument} = await setupOTCFlow({
                site: FixtureSite.singleTier.basic
            });

            await submitSigninForm(popupIframeDocument, 'jamie@example.com');
            submitOTCForm(popupIframeDocument, '123456');

            await waitFor(() => {
                expect(ghostApi.member.verifyOTC).toHaveBeenCalledWith({
                    otc: '123456',
                    otcRef: 'test-otc-ref-123',
                    redirect: undefined,
                    integrityToken: 'testtoken'
                });
            });
        });
    });
});
