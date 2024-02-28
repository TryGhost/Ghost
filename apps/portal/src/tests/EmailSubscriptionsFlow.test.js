import App from '../App.js';
import {appRender, fireEvent, within} from '../utils/test-utils';
import {newsletters as Newsletters, site as FixtureSite, member as FixtureMember} from '../utils/test-fixtures';
import setupGhostApi from '../utils/api.js';
import userEvent from '@testing-library/user-event';

const setup = async ({site, member = null, newsletters}) => {
    const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
    // console.log(newsletters);
    // console.log(site);
    ghostApi.init = jest.fn(() => {
        return Promise.resolve({
            site,
            member,
            newsletters
        });
    });

    ghostApi.member.update = jest.fn(() => {
        return Promise.resolve({
            newsletters: [],
            enable_comment_notifications: false
        });
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
    const manageSubscriptionsButton = within(popupIframeDocument).queryByRole('button', {name: 'Manage'});
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
        manageSubscriptionsButton,
        ...utils
    };
};

describe('Newsletter Subscriptions', () => {
    test('list newsletters to subscribe to', async () => {
        const {ghostApi, popupFrame, triggerButtonFrame, accountHomeTitle, manageSubscriptionsButton, popupIframeDocument} = await setup({
            site: FixtureSite.singleTier.onlyFreePlanWithoutStripe,
            member: FixtureMember.subbedToNewsletter,
            newsletters: Newsletters
        });
        expect(popupFrame).toBeInTheDocument();
        expect(triggerButtonFrame).toBeInTheDocument();
        expect(accountHomeTitle).toBeInTheDocument();
        expect(manageSubscriptionsButton).toBeInTheDocument();

        // unsure why fireEvent has no effect here
        // await fireEvent.click(manageSubscriptionsButton);
        await userEvent.click(manageSubscriptionsButton);

        const newsletter1 = within(popupIframeDocument).queryByText('Newsletter 1');
        const newsletter2 = within(popupIframeDocument).queryByText('Newsletter 2');
        const emailPreferences = within(popupIframeDocument).queryByText('Email preferences');

        expect(newsletter1).toBeInTheDocument();
        expect(newsletter2).toBeInTheDocument();
        expect(emailPreferences).toBeInTheDocument();
    });

    test('unsubscribe from all newsletters', async () => {
        const {ghostApi, popupFrame, triggerButtonFrame, accountHomeTitle, manageSubscriptionsButton, popupIframeDocument} = await setup({
            site: FixtureSite.singleTier.onlyFreePlanWithoutStripe,
            member: FixtureMember.subbedToNewsletter,
            newsletters: Newsletters
        });
        expect(popupFrame).toBeInTheDocument();
        expect(triggerButtonFrame).toBeInTheDocument();
        expect(accountHomeTitle).toBeInTheDocument();
        expect(manageSubscriptionsButton).toBeInTheDocument();
        await userEvent.click(manageSubscriptionsButton);
        const unsubscribeAllButton = within(popupIframeDocument).queryByRole('button', {name: 'Unsubscribe from all emails'});
        expect(unsubscribeAllButton).toBeInTheDocument();

        fireEvent.click(unsubscribeAllButton);

        expect(ghostApi.member.update).toHaveBeenCalled();
    });
});
