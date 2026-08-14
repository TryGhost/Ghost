import App from '../src/app';
import {fireEvent, appRender, within, waitFor} from './utils/test-utils';
import {offer as FixtureOffer, site as FixtureSite, member as FixtureMember} from './utils/test-fixtures';
import setupGhostApi from '../src/utils/api.js';

// Simple deep clone function
const deepClone = obj => JSON.parse(JSON.stringify(obj));

const offerSetup = async ({site, member = null, offer}) => {
    const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
    ghostApi.init = vi.fn(() => {
        return Promise.resolve({
            site: deepClone(site),
            member: member ? deepClone(member) : null
        });
    });

    ghostApi.member.sendMagicLink = vi.fn(() => {
        return Promise.resolve('success');
    });

    ghostApi.member.getIntegrityToken = vi.fn(() => {
        return Promise.resolve(`testtoken`);
    });

    ghostApi.site.offer = vi.fn(() => {
        return Promise.resolve({
            offers: [offer]
        });
    });

    ghostApi.member.checkoutPlan = vi.fn(() => {
        return Promise.resolve();
    });

    const utils = appRender(
        <App api={ghostApi} />
    );

    const popupFrame = await utils.findByTitle(/portal-popup/i);
    const triggerButtonFrame = await utils.queryByTitle(/portal-trigger/i);
    const popupIframeDocument = popupFrame.contentDocument;

    let emailInput, nameInput, continueButton, chooseBtns, signinButton, siteTitle, offerName, offerDescription, freePlanTitle, monthlyPlanTitle, yearlyPlanTitle, fullAccessTitle;

    if (popupIframeDocument) {
        // The offer page renders only after the async site.offer() request resolves, so wait for
        // its content before capturing queries to avoid snapshotting the loading/empty popup.
        await waitFor(() => {
            expect(within(popupIframeDocument).queryByText(offer.display_title)).toBeInTheDocument();
        });
        emailInput = within(popupIframeDocument).queryByLabelText(/email/i);
        nameInput = within(popupIframeDocument).queryByLabelText(/name/i);
        continueButton = within(popupIframeDocument).queryByRole('button', {name: 'Continue'});
        chooseBtns = within(popupIframeDocument).queryAllByRole('button', {name: 'Choose'});
        signinButton = within(popupIframeDocument).queryByRole('button', {name: 'Sign in'});
        siteTitle = within(popupIframeDocument).queryByText(site.title);
        offerName = within(popupIframeDocument).queryByText(offer.display_title);
        offerDescription = within(popupIframeDocument).queryByText(offer.display_description);

        freePlanTitle = within(popupIframeDocument).queryByText('Free');
        monthlyPlanTitle = within(popupIframeDocument).queryByText('Monthly');
        yearlyPlanTitle = within(popupIframeDocument).queryByText('Yearly');
        fullAccessTitle = within(popupIframeDocument).queryByText('Full access');
    }

    return {
        ghostApi,
        popupIframeDocument,
        popupFrame,
        triggerButtonFrame,
        siteTitle,
        emailInput,
        nameInput,
        signinButton,
        submitButton: continueButton,
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

const setup = async ({site, member = null, checkoutPlanError = null}) => {
    const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
    ghostApi.init = vi.fn(() => {
        return Promise.resolve({
            site: deepClone(site),
            member: member ? deepClone(member) : null
        });
    });

    ghostApi.member.sendMagicLink = vi.fn(async ({email}) => {
        if (email.endsWith('@test-inbox-link.example')) {
            return {
                inboxLinks: {
                    provider: 'proton',
                    android: 'https://fake-proton.example/',
                    desktop: 'https://fake-proton.example/'
                }
            };
        } else {
            return {};
        }
    });

    ghostApi.member.getIntegrityToken = vi.fn(() => {
        return Promise.resolve(`testtoken`);
    });

    ghostApi.member.checkoutPlan = vi.fn(() => {
        if (checkoutPlanError) {
            return Promise.reject(checkoutPlanError);
        }
        return Promise.resolve();
    });

    const utils = appRender(
        <App api={ghostApi} />
    );

    const triggerButtonFrame = await utils.findByTitle(/portal-trigger/i);
    const popupFrame = utils.queryByTitle(/portal-popup/i);
    const popupIframeDocument = popupFrame?.contentDocument;

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
    ghostApi.init = vi.fn(() => {
        return Promise.resolve({
            site: deepClone(site),
            member: member ? deepClone(member) : null
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

        test('with inbox link', async () => {
            const {
                emailInput,
                nameInput,
                popupIframeDocument,
                chooseBtns
            } = await setup({
                site: FixtureSite.singleTier.basic
            });

            fireEvent.change(nameInput, {target: {value: 'Jamie Larsen'}});
            fireEvent.change(emailInput, {target: {value: 'test@test-inbox-link.example'}});

            expect(emailInput).toHaveValue('test@test-inbox-link.example');
            expect(nameInput).toHaveValue('Jamie Larsen');
            fireEvent.click(chooseBtns[0]);

            const inboxLinkButton = await within(popupIframeDocument).findByRole('link', {name: /open proton mail/i});
            expect(inboxLinkButton).toBeInTheDocument();
            expect(inboxLinkButton).toHaveAttribute('href', 'https://fake-proton.example/');
            expect(inboxLinkButton).toHaveAttribute('target', '_blank');
        });

        test('hides inbox links on iOS', async () => {
            const userAgentSpy = vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
                'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
            );

            try {
                const {
                    emailInput,
                    nameInput,
                    popupIframeDocument,
                    chooseBtns
                } = await setup({
                    site: FixtureSite.singleTier.basic
                });

                fireEvent.change(nameInput, {target: {value: 'Jamie Larsen'}});
                fireEvent.change(emailInput, {target: {value: 'test@test-inbox-link.example'}});

                expect(emailInput).toHaveValue('test@test-inbox-link.example');
                expect(nameInput).toHaveValue('Jamie Larsen');
                fireEvent.click(chooseBtns[0]);

                const magicLink = await within(popupIframeDocument).findByText(/now check your email/i);
                expect(magicLink).toBeInTheDocument();

                const inboxLinkButton = within(popupIframeDocument).queryByRole('link', {name: /open proton mail/i});
                expect(inboxLinkButton).not.toBeInTheDocument();
            } finally {
                userAgentSpy.mockRestore();
            }
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
            // Wait for the benefit to appear in the UI - it may appear multiple times, so use findAllByText
            await waitFor(() => {
                expect(
                    within(popupIframeDocument).queryAllByText(benefitText).length
                ).toBeGreaterThan(0);
            });
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
            // Wait for the benefit to appear in the UI - it may appear multiple times, so use findAllByText
            await waitFor(() => {
                expect(
                    within(popupIframeDocument).queryAllByText(benefitText).length
                ).toBeGreaterThan(0);
            });
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
            // Wait for the benefit to appear in the UI - it may appear multiple times, so use findAllByText
            await waitFor(() => {
                expect(
                    within(popupIframeDocument).queryAllByText(benefitText).length
                ).toBeGreaterThan(0);
            });

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

        test('via direct signup link shows an error instead of the magic link page', async () => {
            const siteData = FixtureSite.singleTier.basic;
            const paidTier = siteData.products.find(p => p.type === 'paid');
            window.location.hash = `#/portal/signup/${paidTier.id}/monthly`;

            try {
                const checkoutError = Object.assign(
                    new Error('A subscription exists for this Member.'),
                    {code: 'CANNOT_CHECKOUT_WITH_EXISTING_SUBSCRIPTION'}
                );

                const {ghostApi, ...utils} = await setup({
                    site: siteData,
                    member: FixtureMember.paid,
                    checkoutPlanError: checkoutError
                });

                const popupFrame = await utils.findByTitle(/portal-popup/i);

                await waitFor(() => {
                    expect(ghostApi.member.checkoutPlan).toHaveBeenCalled();
                });
                await waitFor(() => {
                    expect(within(popupFrame.contentDocument).queryByText(/You already have an active subscription\./i)).toBeInTheDocument();
                });
                expect(within(popupFrame.contentDocument).queryByText(/Now check your email!/i)).not.toBeInTheDocument();
            } finally {
                window.location.hash = '';
            }
        });

        test('to an offer via link', async () => {
            window.location.hash = `#/portal/offers/${FixtureOffer.id}`;
            const {
                ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, signinButton, submitButton, offerDescription
            } = await offerSetup({
                site: FixtureSite.singleTier.basic,
                offer: FixtureOffer
            });
            const tier = FixtureSite.singleTier.basic.products.find(p => p.type === 'paid');

            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            expect(offerDescription).toBeInTheDocument();
            expect(signinButton).toBeInTheDocument();
            expect(ghostApi.member.checkoutPlan).not.toHaveBeenCalled();

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});
            fireEvent.change(nameInput, {target: {value: 'Jamie Larsen'}});
            fireEvent.click(submitButton);

            expect(ghostApi.member.checkoutPlan).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                name: 'Jamie Larsen',
                offerId: FixtureOffer.id,
                plan: tier.monthlyPrice.id,
                tierId: tier.id,
                cadence: 'month'
            });

            window.location.hash = '';
        });

        test('to an offer via link with portal disabled', async () => {
            window.location.hash = `#/portal/offers/${FixtureOffer.id}`;
            const {
                ghostApi, popupFrame, triggerButtonFrame, emailInput, nameInput, submitButton, offerDescription
            } = await offerSetup({
                site: {...FixtureSite.singleTier.basic, portal_button: false},
                offer: FixtureOffer
            });
            const tier = FixtureSite.singleTier.basic.products.find(p => p.type === 'paid');

            // the offer page opens instead of redirecting straight to checkout
            expect(popupFrame).toBeInTheDocument();
            expect(triggerButtonFrame).not.toBeInTheDocument();
            expect(offerDescription).toBeInTheDocument();
            expect(ghostApi.member.checkoutPlan).not.toHaveBeenCalled();

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});
            fireEvent.change(nameInput, {target: {value: 'Jamie Larsen'}});
            fireEvent.click(submitButton);

            expect(ghostApi.member.checkoutPlan).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                name: 'Jamie Larsen',
                offerId: FixtureOffer.id,
                plan: tier.monthlyPrice.id,
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
            window.location.hash = `#/portal/offers/${FixtureOffer.id}`;
            const {
                ghostApi, popupFrame, emailInput, nameInput, submitButton, offerDescription
            } = await offerSetup({
                site: FixtureSite.multipleTiers.basic,
                offer: FixtureOffer
            });
            const tier = FixtureSite.multipleTiers.basic.products.find(p => p.type === 'paid');

            expect(popupFrame).toBeInTheDocument();
            expect(offerDescription).toBeInTheDocument();

            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});
            fireEvent.change(nameInput, {target: {value: 'Jamie Larsen'}});
            fireEvent.click(submitButton);

            expect(ghostApi.member.checkoutPlan).toHaveBeenLastCalledWith({
                email: 'jamie@example.com',
                name: 'Jamie Larsen',
                offerId: FixtureOffer.id,
                plan: tier.monthlyPrice.id,
                tierId: tier.id,
                cadence: 'month'
            });

            window.location.hash = '';
        });
    });

    describe('on a paid-members only site', () => {
        describe('with only a free plan', () => {
            test('the trigger button redirects to signin instead of signup', async () => {
                let {
                    popupFrame, emailInput,
                    freePlanTitle, monthlyPlanTitle, yearlyPlanTitle, fullAccessTitle
                } = await setup({
                    site: {...FixtureSite.singleTier.onlyFreePlan, members_signup_access: 'paid'}
                });

                expect(popupFrame).toBeInTheDocument();

                // Check that the signup form is not rendered
                // - No tiers
                // - No submit button
                expect(freePlanTitle).not.toBeInTheDocument();
                expect(monthlyPlanTitle).not.toBeInTheDocument();
                expect(yearlyPlanTitle).not.toBeInTheDocument();
                expect(fullAccessTitle).not.toBeInTheDocument();

                // Check that the signin form is rendered instead
                const signinTitle = within(popupFrame.contentDocument).queryByText(/Sign in/i);
                expect(signinTitle).toBeInTheDocument();
                expect(emailInput).toBeInTheDocument();
            });
        });

        test('does not render the free tier, only paid tiers', async () => {
            // Setup paid-members only site with 4 tiers: free + 3 paid
            let {
                popupFrame, emailInput, nameInput,
                freePlanTitle, monthlyPlanTitle, yearlyPlanTitle, chooseBtns
            } = await setup({
                site: {...FixtureSite.multipleTiers.basic, members_signup_access: 'paid'}
            });

            expect(popupFrame).toBeInTheDocument();

            // The free tier should not render, as the site is set to paid-members only
            expect(freePlanTitle).not.toBeInTheDocument('Free');

            // Paid tiers should render
            expect(monthlyPlanTitle).toBeInTheDocument();
            expect(yearlyPlanTitle).toBeInTheDocument();

            // The signup form should render
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).toBeInTheDocument();

            // There should be three paid tiers to choose from
            expect(chooseBtns).toHaveLength(3);
        });
    });
});
