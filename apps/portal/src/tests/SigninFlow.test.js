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

    ghostApi.member.checkoutPlan = jest.fn(() => {
        return Promise.resolve();
    });

    const utils = appRender(
        <App api={ghostApi} />
    );
    const triggerButtonFrame = await utils.findByTitle(/portal-trigger/i);
    
    const overlay = utils.queryByTitle(/portal-overlay/i);
    const emailInput = within(overlay).queryByLabelText(/email/i);
    const nameInput = within(overlay).queryByLabelText(/name/i);
    const submitButton = within(overlay).queryByRole('button', {name: 'Continue'});
    const signinButton = within(overlay).queryByRole('button', {name: 'Sign in'});
    const siteTitle = within(overlay).queryByText(site.title);
    const freePlanTitle = within(overlay).queryByText('Free');
    const monthlyPlanTitle = within(overlay).queryByText('Monthly');
    const yearlyPlanTitle = within(overlay).queryByText('Yearly');
    const fullAccessTitle = within(overlay).queryByText('Full access');
    
    const getIframeDocument = async () => {
        const iframe = await within(utils.baseElement).findByTitle(/portal-popup/i);
        return iframe.contentDocument;
    };

    return {
        ghostApi,
        overlay,
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
        ...utils,
        getIframeDocument
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

    ghostApi.member.checkoutPlan = jest.fn(() => {
        return Promise.resolve();
    });

    const utils = appRender(
        <App api={ghostApi} />
    );
    const freeTierDescription = site.products?.find(p => p.type === 'free')?.description;
    const triggerButtonFrame = await utils.findByTitle(/portal-trigger/i);
    
    const overlay = utils.queryByTitle(/portal-overlay/i);

    const emailInput = within(overlay).queryByLabelText(/email/i);
    const nameInput = within(overlay).queryByLabelText(/name/i);
    const submitButton = within(overlay).queryByRole('button', {name: 'Continue'});
    const signinButton = within(overlay).queryByRole('button', {name: 'Sign in'});
    const siteTitle = within(overlay).queryByText(site.title);
    const freePlanTitle = within(overlay).queryAllByText(/free$/i);
    const freePlanDescription = within(overlay).queryAllByText(freeTierDescription);
    const monthlyPlanTitle = within(overlay).queryByText('Monthly');
    const yearlyPlanTitle = within(overlay).queryByText('Yearly');
    const fullAccessTitle = within(overlay).queryByText('Full access');

    const getIframeDocument = async () => {
        const iframe = await within(utils.baseElement).findByTitle(/portal-popup/i);
        return iframe.contentDocument;
    };

    return {
        ghostApi,
        overlay,
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
        ...utils,
        getIframeDocument
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
                ghostApi, overlay, triggerButtonFrame, emailInput, nameInput, submitButton, getIframeDocument
            } = await setup({
                site: FixtureSite.singleTier.basic
            });
            expect(overlay).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).not.toBeInTheDocument();
            expect(submitButton).toBeInTheDocument();

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            expect(emailInput).toHaveValue('jamie@example.com');

            fireEvent.click(submitButton);  
            
            expect(ghostApi.member.sendMagicLink).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                emailType: 'signin'
            });
                
            const iframeDocument = await getIframeDocument();
            const magicLink = await within(iframeDocument).findByText(/Now check your email/i);
            expect(magicLink).toBeInTheDocument();            
        });

        test('without name field', async () => {
            const {ghostApi, overlay, triggerButtonFrame, emailInput, nameInput, submitButton, getIframeDocument} = await setup({
                site: FixtureSite.singleTier.withoutName
            });

            expect(overlay).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).not.toBeInTheDocument();
            expect(submitButton).toBeInTheDocument();

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            expect(emailInput).toHaveValue('jamie@example.com');

            fireEvent.click(submitButton);
            expect(ghostApi.member.sendMagicLink).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                emailType: 'signin'
            });

            const iframeDocument = await getIframeDocument();
            const magicLink = await within(iframeDocument).findByText(/Now check your email/i);
            expect(magicLink).toBeInTheDocument();
        });

        test('with only free plan', async () => {
            let {ghostApi, overlay, triggerButtonFrame, emailInput, nameInput, submitButton,
                getIframeDocument} = await setup({
                site: FixtureSite.singleTier.onlyFreePlan
            });

            expect(overlay).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).not.toBeInTheDocument();
            expect(submitButton).toBeInTheDocument();

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            expect(emailInput).toHaveValue('jamie@example.com');

            fireEvent.click(submitButton);
            expect(ghostApi.member.sendMagicLink).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                emailType: 'signin'
            });

            const iframeDocument = await getIframeDocument();
            const magicLink = await within(iframeDocument).findByText(/Now check your email/i);
            expect(magicLink).toBeInTheDocument();
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
            const {ghostApi, overlay, triggerButtonFrame, emailInput, nameInput, submitButton,
                getIframeDocument} = await multiTierSetup({
                site: FixtureSite.multipleTiers.basic
            });

            expect(overlay).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).not.toBeInTheDocument();
            expect(submitButton).toBeInTheDocument();

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            expect(emailInput).toHaveValue('jamie@example.com');

            fireEvent.click(submitButton);
            expect(ghostApi.member.sendMagicLink).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                emailType: 'signin'
            });

            const iframeDocument = await getIframeDocument();

            const magicLink = await within(iframeDocument).findByText(/Now check your email/i);
            expect(magicLink).toBeInTheDocument();
        });

        test('without name field', async () => {
            const {ghostApi, overlay, triggerButtonFrame, emailInput, nameInput, submitButton,
                getIframeDocument} = await multiTierSetup({
                site: FixtureSite.multipleTiers.withoutName
            });

            expect(overlay).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).not.toBeInTheDocument();
            expect(submitButton).toBeInTheDocument();

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            expect(emailInput).toHaveValue('jamie@example.com');

            fireEvent.click(submitButton);
            expect(ghostApi.member.sendMagicLink).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                emailType: 'signin'
            });

            const iframeDocument = await getIframeDocument();

            const magicLink = await within(iframeDocument).findByText(/Now check your email/i);
            expect(magicLink).toBeInTheDocument();
        });

        test('with only free plan available', async () => {
            let {ghostApi, overlay, triggerButtonFrame, emailInput, nameInput, submitButton,
                getIframeDocument} = await multiTierSetup({
                site: FixtureSite.multipleTiers.onlyFreePlan
            });

            expect(overlay).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).not.toBeInTheDocument();
            expect(submitButton).toBeInTheDocument();

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            expect(emailInput).toHaveValue('jamie@example.com');

            fireEvent.click(submitButton);
            expect(ghostApi.member.sendMagicLink).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                emailType: 'signin'
            });

            const iframeDocument = await getIframeDocument();

            const magicLink = await within(iframeDocument).findByText(/Now check your email/i);
            expect(magicLink).toBeInTheDocument();
        });
    });
});
