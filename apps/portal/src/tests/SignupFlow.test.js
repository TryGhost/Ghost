import App from '../App.js';
import {fireEvent, appRender, within, waitFor} from '../utils/test-utils';
import {offer as FixtureOffer, site as FixtureSite} from '../utils/test-fixtures';
import setupGhostApi from '../utils/api.js';

const offerSetup = async ({site, member = null, offer}) => {
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

    ghostApi.site.offer = jest.fn(() => {
        return Promise.resolve({
            offers: [offer]
        });
    });

    ghostApi.member.checkoutPlan = jest.fn(() => {
        return Promise.resolve();
    });

    const utils = appRender(
        <App api={ghostApi} />
    );

    const popupFrame = await utils.findByTitle(/portal-popup/i);
    const triggerButtonFrame = await utils.queryByTitle(/portal-trigger/i);
    const popupIframeDocument = popupFrame.contentDocument;
    const emailInput = within(popupIframeDocument).queryByLabelText(/email/i);
    const nameInput = within(popupIframeDocument).queryByLabelText(/name/i);
    const submitButton = within(popupIframeDocument).queryByRole('button', {name: 'Continue'});
    const chooseBtns = within(popupIframeDocument).queryAllByRole('button', {name: 'Choose'});
    const signinButton = within(popupIframeDocument).queryByRole('button', {name: 'Sign in'});
    const siteTitle = within(popupIframeDocument).queryByText(site.title);
    const offerName = within(popupIframeDocument).queryByText(offer.display_title);
    const offerDescription = within(popupIframeDocument).queryByText(offer.display_description);

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
        chooseBtns,
        freePlanTitle,
        monthlyPlanTitle,
        yearlyPlanTitle,
        fullAccessTitle,
        offerName,
        offerDescription,
        ...utils
    };
};

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
        return Promise.resolve(`testtoken`);
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
    const chooseBtns = within(popupIframeDocument).queryAllByRole('button', {name: 'Choose'});
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
        chooseBtns,
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
    const chooseBtns = within(popupIframeDocument).queryAllByRole('button', {name: 'Choose'});
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
        chooseBtns,
        ...utils
    };
};

describe('Signup', () => {
    describe('as free member on single tier site', () => {
        test('with default settings', async () => {
            const {
                ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, signinButton,
                siteTitle, popupIframeDocument, freePlanTitle, monthlyPlanTitle, yearlyPlanTitle, chooseBtns
            } = await setup({
                site: FixtureSite.singleTier.basic
            });
            const continueButton = within(popupIframeDocument).queryAllByRole('button', {name: 'Continue'});
            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(siteTitle).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).toBeInTheDocument();
            expect(freePlanTitle).toBeInTheDocument();
            expect(monthlyPlanTitle).toBeInTheDocument();
            expect(yearlyPlanTitle).toBeInTheDocument();
            // expect(fullAccessTitle).toBeInTheDocument();
            expect(signinButton).toBeInTheDocument();
            // expect(submitButton).toBeInTheDocument();
            expect(chooseBtns).toHaveLength(1);
            expect(continueButton).toHaveLength(1);

            fireEvent.change(nameInput, {target: {value: 'Jamie Larsen'}});
            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            expect(emailInput).toHaveValue('jamie@example.com');
            expect(nameInput).toHaveValue('Jamie Larsen');
            fireEvent.click(chooseBtns[0]);

            const magicLink = await within(popupIframeDocument).findByText(/now check your email/i);
            expect(magicLink).toBeInTheDocument();

            expect(ghostApi.member.sendMagicLink).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                emailType: 'signup',
                name: 'Jamie Larsen',
                plan: 'free',
                integrityToken: 'testtoken'
            });
        });

        test('without name field', async () => {
            const {
                ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, signinButton,
                siteTitle, popupIframeDocument, freePlanTitle, monthlyPlanTitle, yearlyPlanTitle, chooseBtns
            } = await setup({
                site: FixtureSite.singleTier.withoutName
            });

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(siteTitle).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).not.toBeInTheDocument();
            expect(freePlanTitle).toBeInTheDocument();
            expect(monthlyPlanTitle).toBeInTheDocument();
            expect(yearlyPlanTitle).toBeInTheDocument();
            // expect(fullAccessTitle).toBeInTheDocument();
            expect(signinButton).toBeInTheDocument();
            expect(chooseBtns).toHaveLength(1);

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            expect(emailInput).toHaveValue('jamie@example.com');
            fireEvent.click(chooseBtns[0]);

            // Check if magic link page is shown
            const magicLink = await within(popupIframeDocument).findByText(/now check your email/i);
            expect(magicLink).toBeInTheDocument();

            expect(ghostApi.member.sendMagicLink).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                emailType: 'signup',
                name: '',
                plan: 'free',
                integrityToken: 'testtoken'
            });
        });

        test('with only free plan', async () => {
            let {
                ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, signinButton, submitButton,
                siteTitle, popupIframeDocument, freePlanTitle, monthlyPlanTitle, yearlyPlanTitle, fullAccessTitle
            } = await setup({
                site: FixtureSite.singleTier.onlyFreePlan
            });

            const freeProduct = FixtureSite.singleTier.onlyFreePlan.products.find(p => p.type === 'free');
            const benefitText = freeProduct.benefits[0].name;

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(siteTitle).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).toBeInTheDocument();
            expect(monthlyPlanTitle).not.toBeInTheDocument();
            expect(yearlyPlanTitle).not.toBeInTheDocument();
            expect(fullAccessTitle).not.toBeInTheDocument();
            expect(signinButton).toBeInTheDocument();
            expect(submitButton).not.toBeInTheDocument();

            // Free tier title, description and benefits should render
            expect(freePlanTitle).toBeInTheDocument();
            await within(popupIframeDocument).findByText(freeProduct.description);
            await within(popupIframeDocument).findByText(benefitText);

            submitButton = within(popupIframeDocument).queryByRole('button', {name: 'Sign up'});

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});
            fireEvent.change(nameInput, {target: {value: 'Jamie Larsen'}});

            expect(emailInput).toHaveValue('jamie@example.com');
            expect(nameInput).toHaveValue('Jamie Larsen');
            fireEvent.click(submitButton);

            // Check if magic link page is shown
            const magicLink = await within(popupIframeDocument).findByText(/now check your email/i);
            expect(magicLink).toBeInTheDocument();

            expect(ghostApi.member.sendMagicLink).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                emailType: 'signup',
                name: 'Jamie Larsen',
                plan: 'free',
                integrityToken: 'testtoken'
            });
        });
    });

    describe('as paid member on single tier site', () => {
        test('with default settings on monthly plan', async () => {
            const {
                ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, signinButton, chooseBtns,
                siteTitle, popupIframeDocument, freePlanTitle, monthlyPlanTitle, yearlyPlanTitle, submitButton
            } = await setup({
                site: FixtureSite.singleTier.basic
            });

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(siteTitle).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).toBeInTheDocument();
            expect(freePlanTitle).toBeInTheDocument();
            expect(monthlyPlanTitle).toBeInTheDocument();
            expect(yearlyPlanTitle).toBeInTheDocument();
            expect(signinButton).toBeInTheDocument();
            expect(chooseBtns).toHaveLength(1);

            const monthlyPlanContainer = within(popupIframeDocument).queryByText(/Monthly$/);
            const singleTierProduct = FixtureSite.singleTier.basic.products.find(p => p.type === 'paid');

            const benefitText = singleTierProduct.benefits[0].name;

            fireEvent.change(nameInput, {target: {value: 'Jamie Larsen'}});
            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            fireEvent.click(monthlyPlanContainer.parentNode);
            await within(popupIframeDocument).findByText(benefitText);
            expect(emailInput).toHaveValue('jamie@example.com');
            expect(nameInput).toHaveValue('Jamie Larsen');
            fireEvent.click(submitButton);
            expect(ghostApi.member.checkoutPlan).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                name: 'Jamie Larsen',
                offerId: undefined,
                plan: singleTierProduct.yearlyPrice.id,
                tierId: singleTierProduct.id,
                cadence: 'year'
            });
        });

        test('with default settings on yearly plan', async () => {
            const {
                ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, signinButton, chooseBtns, submitButton, siteTitle, popupIframeDocument, freePlanTitle, monthlyPlanTitle, yearlyPlanTitle
            } = await setup({
                site: FixtureSite.singleTier.basic
            });

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(siteTitle).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).toBeInTheDocument();
            expect(freePlanTitle).toBeInTheDocument();
            expect(monthlyPlanTitle).toBeInTheDocument();
            expect(yearlyPlanTitle).toBeInTheDocument();
            expect(signinButton).toBeInTheDocument();
            expect(chooseBtns).toHaveLength(1);

            const yearlyPlanContainer = within(popupIframeDocument).queryByText(/Yearly$/);
            const singleTierProduct = FixtureSite.singleTier.basic.products.find(p => p.type === 'paid');

            const benefitText = singleTierProduct.benefits[0].name;

            fireEvent.change(nameInput, {target: {value: 'Jamie Larsen'}});
            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            fireEvent.click(yearlyPlanContainer.parentNode);
            await within(popupIframeDocument).findByText(benefitText);
            expect(emailInput).toHaveValue('jamie@example.com');
            expect(nameInput).toHaveValue('Jamie Larsen');
            fireEvent.click(submitButton);
            expect(ghostApi.member.checkoutPlan).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                name: 'Jamie Larsen',
                offerId: undefined,
                plan: singleTierProduct.yearlyPrice.id,
                tierId: singleTierProduct.id,
                cadence: 'year'
            });
        });

        test('without name field on monthly plan', async () => {
            const {
                ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, signinButton, chooseBtns,
                siteTitle, popupIframeDocument, freePlanTitle, monthlyPlanTitle, yearlyPlanTitle, submitButton
            } = await setup({
                site: FixtureSite.singleTier.withoutName
            });

            const monthlyPlanContainer = within(popupIframeDocument).queryByText(/Monthly$/);
            const singleTierProduct = FixtureSite.singleTier.basic.products.find(p => p.type === 'paid');
            const benefitText = singleTierProduct.benefits[0].name;

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(siteTitle).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).not.toBeInTheDocument();
            expect(freePlanTitle).toBeInTheDocument();
            expect(monthlyPlanTitle).toBeInTheDocument();
            expect(yearlyPlanTitle).toBeInTheDocument();
            expect(signinButton).toBeInTheDocument();
            expect(chooseBtns).toHaveLength(1);

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            fireEvent.click(monthlyPlanContainer);
            await within(popupIframeDocument).findByText(benefitText);

            expect(emailInput).toHaveValue('jamie@example.com');
            fireEvent.click(submitButton);

            expect(ghostApi.member.checkoutPlan).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                name: '',
                offerId: undefined,
                plan: singleTierProduct.monthlyPrice.id,
                tierId: singleTierProduct.id,
                cadence: 'month'
            });
        });

        test('with only paid plans available', async () => {
            let {
                ghostApi, popupFrame, popupIframeDocument, triggerButtonFrame, emailInput, nameInput, signinButton,
                siteTitle, freePlanTitle, monthlyPlanTitle, yearlyPlanTitle
            } = await setup({
                site: FixtureSite.singleTier.onlyPaidPlan
            });
            const submitButton = within(popupIframeDocument).queryAllByRole('button', {name: 'Continue'});

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(siteTitle).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).toBeInTheDocument();
            expect(freePlanTitle).not.toBeInTheDocument();
            expect(monthlyPlanTitle).toBeInTheDocument();
            expect(yearlyPlanTitle).toBeInTheDocument();
            expect(signinButton).toBeInTheDocument();
            expect(submitButton).toHaveLength(1);

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});
            fireEvent.change(nameInput, {target: {value: 'Jamie Larsen'}});

            expect(emailInput).toHaveValue('jamie@example.com');
            expect(nameInput).toHaveValue('Jamie Larsen');

            fireEvent.click(submitButton[0]);
            const singleTierProduct = FixtureSite.singleTier.basic.products.find(p => p.type === 'paid');

            expect(ghostApi.member.checkoutPlan).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                name: 'Jamie Larsen',
                offerId: undefined,
                plan: singleTierProduct.yearlyPrice.id,
                tierId: singleTierProduct.id,
                cadence: 'year'
            });
        });

        test('to an offer via link', async () => {
            window.location.hash = '#/portal/offers/61fa22bd0cbecc7d423d20b3';
            const {
                ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, signinButton, submitButton,
                siteTitle,
                offerName, offerDescription
            } = await offerSetup({
                site: FixtureSite.singleTier.basic,
                offer: FixtureOffer
            });
            let planId = FixtureSite.singleTier.basic.products.find(p => p.type === 'paid').monthlyPrice.id;
            let tier = FixtureSite.singleTier.basic.products.find(p => p.type === 'paid');
            let offerId = FixtureOffer.id;
            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(siteTitle).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).toBeInTheDocument();
            expect(signinButton).toBeInTheDocument();
            expect(submitButton).toBeInTheDocument();
            expect(offerName).toBeInTheDocument();
            expect(offerDescription).toBeInTheDocument();

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});
            fireEvent.change(nameInput, {target: {value: 'Jamie Larsen'}});

            expect(emailInput).toHaveValue('jamie@example.com');
            fireEvent.click(submitButton);

            expect(ghostApi.member.checkoutPlan).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                name: 'Jamie Larsen',
                offerId,
                plan: planId,
                tierId: tier.id,
                cadence: 'month'
            });

            window.location.hash = '';
        });

        test('to an offer via link with portal disabled', async () => {
            let site = {
                ...FixtureSite.singleTier.basic,
                portal_button: false
            };
            window.location.hash = `#/portal/offers/${FixtureOffer.id}`;
            const {
                ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, signinButton, submitButton,
                siteTitle,
                offerName, offerDescription
            } = await offerSetup({
                site,
                offer: FixtureOffer
            });
            let planId = FixtureSite.singleTier.basic.products.find(p => p.type === 'paid').monthlyPrice.id;
            let tier = FixtureSite.singleTier.basic.products.find(p => p.type === 'paid');
            let offerId = FixtureOffer.id;
            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).not.toBeInTheDocument();
            expect(siteTitle).not.toBeInTheDocument();
            expect(emailInput).not.toBeInTheDocument();
            expect(nameInput).not.toBeInTheDocument();
            expect(signinButton).not.toBeInTheDocument();
            expect(submitButton).not.toBeInTheDocument();
            expect(offerName).not.toBeInTheDocument();
            expect(offerDescription).not.toBeInTheDocument();

            expect(ghostApi.member.checkoutPlan).toHaveBeenLastCalledWith({
                email: undefined,
                name: undefined,
                offerId: offerId,
                plan: planId,
                tierId: tier.id,
                cadence: 'month'
            });

            window.location.hash = '';
        });
    });

    describe('as free member on multi tier site', () => {
        test('with default settings', async () => {
            const {
                ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, signinButton, chooseBtns,
                siteTitle, popupIframeDocument, freePlanTitle
            } = await multiTierSetup({
                site: FixtureSite.multipleTiers.basic
            });

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(siteTitle).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).toBeInTheDocument();
            expect(freePlanTitle[0]).toBeInTheDocument();
            expect(signinButton).toBeInTheDocument();
            expect(chooseBtns).toHaveLength(4);

            fireEvent.change(nameInput, {target: {value: 'Jamie Larsen'}});
            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            expect(emailInput).toHaveValue('jamie@example.com');
            expect(nameInput).toHaveValue('Jamie Larsen');
            fireEvent.click(chooseBtns[0]);

            const magicLink = await within(popupIframeDocument).findByText(/now check your email/i);
            expect(magicLink).toBeInTheDocument();

            expect(ghostApi.member.sendMagicLink).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                emailType: 'signup',
                name: 'Jamie Larsen',
                plan: 'free',
                integrityToken: 'testtoken'
            });
        });

        test('without name field', async () => {
            const {
                ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, signinButton, chooseBtns,
                siteTitle, popupIframeDocument, freePlanTitle
            } = await multiTierSetup({
                site: FixtureSite.multipleTiers.withoutName
            });

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(siteTitle).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).not.toBeInTheDocument();
            expect(freePlanTitle[0]).toBeInTheDocument();
            expect(signinButton).toBeInTheDocument();

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            expect(emailInput).toHaveValue('jamie@example.com');
            fireEvent.click(chooseBtns[0]);

            // Check if magic link page is shown
            const magicLink = await within(popupIframeDocument).findByText(/now check your email/i);
            expect(magicLink).toBeInTheDocument();

            expect(ghostApi.member.sendMagicLink).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                emailType: 'signup',
                name: '',
                plan: 'free',
                integrityToken: 'testtoken'
            });
        });

        test('with only free plan available', async () => {
            let {
                ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, signinButton, submitButton,
                siteTitle, popupIframeDocument, freePlanTitle
            } = await multiTierSetup({
                site: FixtureSite.multipleTiers.onlyFreePlan
            });

            const freeProduct = FixtureSite.multipleTiers.onlyFreePlan.products.find(p => p.type === 'free');
            const benefitText = freeProduct.benefits[0].name;

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(siteTitle).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).toBeInTheDocument();
            expect(signinButton).toBeInTheDocument();
            expect(submitButton).not.toBeInTheDocument();

            // Free tier title, description and benefits should render
            expect(freePlanTitle.length).toBe(1);
            await within(popupIframeDocument).findByText(freeProduct.description);
            await within(popupIframeDocument).findByText(benefitText);

            submitButton = within(popupIframeDocument).queryByRole('button', {name: 'Sign up'});

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});
            fireEvent.change(nameInput, {target: {value: 'Jamie Larsen'}});

            expect(emailInput).toHaveValue('jamie@example.com');
            expect(nameInput).toHaveValue('Jamie Larsen');
            fireEvent.click(submitButton);

            // Check if magic link page is shown
            const magicLink = await within(popupIframeDocument).findByText(/now check your email/i);
            expect(magicLink).toBeInTheDocument();

            expect(ghostApi.member.sendMagicLink).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                emailType: 'signup',
                name: 'Jamie Larsen',
                plan: 'free',
                integrityToken: 'testtoken'
            });
        });

        test('should not show free plan if it is hidden', async () => {
            let {
                popupFrame, triggerButtonFrame, emailInput, nameInput,
                siteTitle, freePlanTitle
            } = await multiTierSetup({
                site: FixtureSite.multipleTiers.onlyPaidPlans
            });

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(siteTitle).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).toBeInTheDocument();
            expect(freePlanTitle.length).toBe(0);
        });
    });

    describe('as paid member on multi tier site', () => {
        test('with default settings', async () => {
            const {
                ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, signinButton, chooseBtns,
                siteTitle, popupIframeDocument, freePlanTitle
            } = await multiTierSetup({
                site: FixtureSite.multipleTiers.basic
            });

            const firstPaidTier = FixtureSite.singleTier.basic.products.find(p => p.type === 'paid');

            const regex = new RegExp(`${firstPaidTier.name}$`);
            const tierContainer = within(popupIframeDocument).queryAllByText(regex);

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(siteTitle).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).toBeInTheDocument();
            expect(freePlanTitle[0]).toBeInTheDocument();
            expect(signinButton).toBeInTheDocument();
            expect(chooseBtns).toHaveLength(4);

            fireEvent.change(nameInput, {target: {value: 'Jamie Larsen'}});
            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            expect(emailInput).toHaveValue('jamie@example.com');
            expect(nameInput).toHaveValue('Jamie Larsen');

            fireEvent.click(tierContainer[0]);
            const labelText = popupIframeDocument.querySelector('.gh-portal-discount-label');
            await waitFor(() => {
                expect(labelText).toBeInTheDocument();
            });

            // added fake timeout for react state delay in setting plan
            await new Promise((r) => {
                setTimeout(r, 10);
            });
            fireEvent.click(chooseBtns[1]);
            await waitFor(() => expect(ghostApi.member.checkoutPlan).toHaveBeenCalledTimes(1));
        });

        test('to an offer via link', async () => {
            window.location.hash = '#/portal/offers/61fa22bd0cbecc7d423d20b3';
            const {
                ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, signinButton, submitButton,
                siteTitle,
                offerName, offerDescription
            } = await offerSetup({
                site: FixtureSite.multipleTiers.basic,
                offer: FixtureOffer
            });
            let planId = FixtureSite.singleTier.basic.products.find(p => p.type === 'paid').monthlyPrice.id;
            let tier = FixtureSite.singleTier.basic.products.find(p => p.type === 'paid');
            let offerId = FixtureOffer.id;
            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(siteTitle).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).toBeInTheDocument();
            expect(signinButton).toBeInTheDocument();
            expect(submitButton).toBeInTheDocument();
            expect(offerName).toBeInTheDocument();
            expect(offerDescription).toBeInTheDocument();

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});
            fireEvent.change(nameInput, {target: {value: 'Jamie Larsen'}});

            expect(emailInput).toHaveValue('jamie@example.com');
            fireEvent.click(submitButton);

            expect(ghostApi.member.checkoutPlan).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                name: 'Jamie Larsen',
                offerId,
                plan: planId,
                tierId: tier.id,
                cadence: 'month'
            });

            window.location.hash = '';
        });

        test('to an offer via link with portal disabled', async () => {
            let site = {
                ...FixtureSite.multipleTiers.basic,
                portal_button: false
            };
            window.location.hash = `#/portal/offers/${FixtureOffer.id}`;
            const {
                ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, signinButton, submitButton,
                siteTitle,
                offerName, offerDescription
            } = await offerSetup({
                site,
                offer: FixtureOffer
            });
            const singleTier = FixtureSite.singleTier.basic.products.find(p => p.type === 'paid');
            let planId = FixtureSite.singleTier.basic.products.find(p => p.type === 'paid').monthlyPrice.id;
            let offerId = FixtureOffer.id;
            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).not.toBeInTheDocument();
            expect(siteTitle).not.toBeInTheDocument();
            expect(emailInput).not.toBeInTheDocument();
            expect(nameInput).not.toBeInTheDocument();
            expect(signinButton).not.toBeInTheDocument();
            expect(submitButton).not.toBeInTheDocument();
            expect(offerName).not.toBeInTheDocument();
            expect(offerDescription).not.toBeInTheDocument();

            expect(ghostApi.member.checkoutPlan).toHaveBeenLastCalledWith({
                email: undefined,
                name: undefined,
                offerId: offerId,
                plan: planId,
                tierId: singleTier.id,
                cadence: 'month'
            });

            window.location.hash = '';
        });
    });
});
