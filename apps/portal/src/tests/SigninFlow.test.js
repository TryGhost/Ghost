import App from '../App.js';
import {fireEvent, appRender, within} from '../utils/test-utils';
import {site as FixtureSite} from '../utils/test-fixtures';
import setupGhostApi from '../utils/api.js';

const setup = async ({site, member = null}) => {
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
        <App api={ghostApi} />
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
