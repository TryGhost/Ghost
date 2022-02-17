import React from 'react';
import App from '../App.js';
import {fireEvent, appRender, within} from '../utils/test-utils';
import {offer as FixtureOffer, site as FixtureSite, member as FixtureMember} from '../utils/test-fixtures';
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

    const triggerButtonFrame = await utils.findByTitle(/portal-trigger/i);
    const popupFrame = utils.queryByTitle(/portal-popup/i);
    const popupIframeDocument = popupFrame.contentDocument;
    const emailInput = within(popupIframeDocument).queryByLabelText(/email/i);
    const nameInput = within(popupIframeDocument).queryByLabelText(/name/i);
    const submitButton = within(popupIframeDocument).queryByRole('button', {name: 'Continue'});
    const signinButton = within(popupIframeDocument).queryByRole('button', {name: 'Sign in'});
    const siteTitle = within(popupIframeDocument).queryByText(site.title);
    const offerName = within(popupIframeDocument).queryByText(offer.name);
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
    const accountHomeTitle = within(popupIframeDocument).queryByText('Your account');
    const viewPlansButton = within(popupIframeDocument).queryByRole('button', {name: 'View plans'});
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
        accountHomeTitle,
        viewPlansButton,
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
    const accountHomeTitle = within(popupIframeDocument).queryByText('Your account');
    const viewPlansButton = within(popupIframeDocument).queryByRole('button', {name: 'View plans'});
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
        accountHomeTitle,
        viewPlansButton,
        ...utils
    };
};

describe('Logged-in free member', () => {
    describe('can upgrade on single tier site', () => {
        test('with default settings on monthly plan', async () => {
            const {
                ghostApi, popupFrame, triggerButtonFrame,
                popupIframeDocument, accountHomeTitle, viewPlansButton
            } = await setup({
                site: FixtureSite.singleTier.basic,
                member: FixtureMember.free
            });

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(accountHomeTitle).toBeInTheDocument();
            expect(viewPlansButton).toBeInTheDocument();

            const singleTierProduct = FixtureSite.singleTier.basic.products.find(p => p.type === 'paid');

            fireEvent.click(viewPlansButton);
            await within(popupIframeDocument).findByText('Monthly');
            const submitButton = within(popupIframeDocument).queryByRole('button', {name: 'Continue'});

            fireEvent.click(submitButton);
            expect(ghostApi.member.checkoutPlan).toHaveBeenLastCalledWith({
                metadata: {
                    checkoutType: 'upgrade'
                },
                offerId: undefined,
                plan: singleTierProduct.monthlyPrice.id
            });
        });

        test('with default settings on yearly plan', async () => {
            const {
                ghostApi, popupFrame, triggerButtonFrame,
                popupIframeDocument, accountHomeTitle, viewPlansButton
            } = await setup({
                site: FixtureSite.singleTier.basic,
                member: FixtureMember.free
            });

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(accountHomeTitle).toBeInTheDocument();
            expect(viewPlansButton).toBeInTheDocument();

            const singleTierProduct = FixtureSite.singleTier.basic.products.find(p => p.type === 'paid');

            fireEvent.click(viewPlansButton);
            await within(popupIframeDocument).findByText('Monthly');
            const yearlyPlanContainer = await within(popupIframeDocument).findByText('Yearly');
            fireEvent.click(yearlyPlanContainer.parentNode);
            // added fake timeout for react state delay in setting plan
            await new Promise(r => setTimeout(r, 10));

            const submitButton = within(popupIframeDocument).queryByRole('button', {name: 'Continue'});

            fireEvent.click(submitButton);
            expect(ghostApi.member.checkoutPlan).toHaveBeenLastCalledWith({
                metadata: {
                    checkoutType: 'upgrade'
                },
                offerId: undefined,
                plan: singleTierProduct.yearlyPrice.id
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
                member: FixtureMember.altFree,
                offer: FixtureOffer
            });
            let planId = FixtureSite.singleTier.basic.products.find(p => p.type === 'paid').monthlyPrice.id;
            let offerId = FixtureOffer.id;
            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(siteTitle).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).toBeInTheDocument();
            expect(signinButton).not.toBeInTheDocument();
            expect(submitButton).toBeInTheDocument();
            expect(offerName).toBeInTheDocument();
            expect(offerDescription).toBeInTheDocument();

            expect(emailInput).toHaveValue('jimmie@example.com');
            expect(nameInput).toHaveValue('Jimmie Larson');
            fireEvent.click(submitButton);

            expect(ghostApi.member.checkoutPlan).toHaveBeenLastCalledWith({
                email: 'jimmie@example.com',
                name: 'Jimmie Larson',
                offerId,
                plan: planId
            });

            window.location.hash = '';
        });
    });
});

describe('Logged-in free member', () => {
    describe('can upgrade on multi tier site', () => {
        test('with default settings', async () => {
            const {
                ghostApi, popupFrame, triggerButtonFrame,
                popupIframeDocument, accountHomeTitle, viewPlansButton
            } = await multiTierSetup({
                site: FixtureSite.multipleTiers.basic,
                member: FixtureMember.free
            });

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(accountHomeTitle).toBeInTheDocument();
            expect(viewPlansButton).toBeInTheDocument();

            const singleTierProduct = FixtureSite.multipleTiers.basic.products.find(p => p.type === 'paid');

            fireEvent.click(viewPlansButton);
            await within(popupIframeDocument).findByText('Monthly');

            // allow default checkbox switch to yearly
            await new Promise(r => setTimeout(r, 10));

            const submitButton = within(popupIframeDocument).queryByRole('button', {name: 'Continue'});

            fireEvent.click(submitButton);
            expect(ghostApi.member.checkoutPlan).toHaveBeenLastCalledWith({
                metadata: {
                    checkoutType: 'upgrade'
                },
                offerId: undefined,
                plan: singleTierProduct.yearlyPrice.id
            });
        });

        test('to an offer via link', async () => {
            window.location.hash = '#/portal/offers/61fa22bd0cbecc7d423d20b3';
            const {
                ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, signinButton, submitButton,
                siteTitle,
                offerName, offerDescription
            } = await offerSetup({
                site: FixtureSite.multipleTiers.basic,
                member: FixtureMember.altFree,
                offer: FixtureOffer
            });
            let planId = FixtureSite.multipleTiers.basic.products.find(p => p.type === 'paid').monthlyPrice.id;
            let offerId = FixtureOffer.id;
            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(siteTitle).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).toBeInTheDocument();
            expect(signinButton).not.toBeInTheDocument();
            expect(submitButton).toBeInTheDocument();
            expect(offerName).toBeInTheDocument();
            expect(offerDescription).toBeInTheDocument();

            expect(emailInput).toHaveValue('jimmie@example.com');
            expect(nameInput).toHaveValue('Jimmie Larson');
            fireEvent.click(submitButton);

            expect(ghostApi.member.checkoutPlan).toHaveBeenLastCalledWith({
                email: 'jimmie@example.com',
                name: 'Jimmie Larson',
                offerId,
                plan: planId
            });

            window.location.hash = '';
        });
    });
});
