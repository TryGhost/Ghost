import App from '../App.js';
import {appRender, fireEvent, within} from '../utils/test-utils';
import {newsletters as Newsletters, site as FixtureSite, member as FixtureMember} from '../utils/test-fixtures';
import setupGhostApi from '../utils/api.js';
import userEvent from '@testing-library/user-event';

const setup = async ({site, member = null, newsletters}, loggedOut = false) => {
    const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
    ghostApi.init = jest.fn(() => {
        return Promise.resolve({
            site,
            member: loggedOut ? null : member,
            newsletters
        });
    });

    ghostApi.member.update = jest.fn(({newsletters: newNewsletters}) => {
        return Promise.resolve({
            newsletters: newNewsletters,
            enable_comment_notifications: false
        });
    });

    ghostApi.member.newsletters = jest.fn(() => {
        return Promise.resolve({
            newsletters
        });
    });

    ghostApi.member.updateNewsletters = jest.fn(({uuid: memberUuid, newsletters: newNewsletters, enableCommentNotifications}) => {
        return Promise.resolve({
            uuid: memberUuid,
            newsletters: newNewsletters,
            enable_comment_notifications: enableCommentNotifications
        });
    });

    const utils = appRender(
        <App api={ghostApi} />
    );

    const triggerButtonFrame = await utils.findByTitle(/portal-trigger/i);
    const triggerButton = within(triggerButtonFrame.contentDocument).getByTestId('portal-trigger-button');
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
        triggerButton,
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
        const {popupFrame, triggerButtonFrame, accountHomeTitle, manageSubscriptionsButton, popupIframeDocument} = await setup({
            site: FixtureSite.singleTier.onlyFreePlanWithoutStripe,
            member: FixtureMember.subbedToNewsletter,
            newsletters: Newsletters
        });
        expect(popupFrame).toBeInTheDocument();
        expect(triggerButtonFrame).toBeInTheDocument();
        expect(accountHomeTitle).toBeInTheDocument();
        expect(manageSubscriptionsButton).toBeInTheDocument();

        // unsure why fireEvent has no effect here
        await userEvent.click(manageSubscriptionsButton);

        const newsletter1 = within(popupIframeDocument).queryByText('Newsletter 1');
        const newsletter2 = within(popupIframeDocument).queryByText('Newsletter 2');
        const emailPreferences = within(popupIframeDocument).queryByText('Email preferences');

        expect(newsletter1).toBeInTheDocument();
        expect(newsletter2).toBeInTheDocument();
        expect(emailPreferences).toBeInTheDocument();
    });

    test('toggle subscribing to a newsletter', async () => {
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

        const newsletter1 = within(popupIframeDocument).queryByText('Newsletter 1');
        expect(newsletter1).toBeInTheDocument();

        // unsubscribe from Newsletter 1
        const subscriptionToggles = within(popupIframeDocument).getAllByTestId('switch-input');
        const newsletter1Toggle = subscriptionToggles[0];
        expect(newsletter1Toggle).toBeInTheDocument();
        await userEvent.click(newsletter1Toggle);
        
        // verify that subscription to Newsletter 1 was removed
        const expectedSubscriptions = Newsletters.filter(n => n.id !== Newsletters[0].id).map(n => ({id: n.id}));
        expect(ghostApi.member.update).toHaveBeenLastCalledWith(
            {newsletters: expectedSubscriptions}
        );
        const subscriptionToggleContainers = within(popupIframeDocument).getAllByTestId('checkmark-container');
        const newsletter1ToggleContainer = subscriptionToggleContainers[0];
        expect(newsletter1ToggleContainer).toBeInTheDocument();
        expect(newsletter1ToggleContainer).not.toHaveClass('gh-portal-toggle-checked');
        const newsletter2ToggleContainer = subscriptionToggleContainers[1];
        expect(newsletter2ToggleContainer).toBeInTheDocument();
        expect(newsletter2ToggleContainer).toHaveClass('gh-portal-toggle-checked');

        // resubscribe to Newsletter 1
        await userEvent.click(newsletter1Toggle);
        expect(newsletter1ToggleContainer).toHaveClass('gh-portal-toggle-checked');
        expect(ghostApi.member.update).toHaveBeenLastCalledWith(
            {newsletters: Newsletters.reverse().map(n => ({id: n.id}))}
        );
    });

    test('unsubscribe from all newsletters when logged in', async () => {
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

        expect(ghostApi.member.update).toHaveBeenCalledWith({newsletters: [], enableCommentNotifications: false});
        // Verify the local state shows the newsletter as unsubscribed
        let newsletterToggles = within(popupIframeDocument).queryAllByTestId('checkmark-container');
        let newsletter1Toggle = newsletterToggles[0];
        let newsletter2Toggle = newsletterToggles[1];

        expect(newsletter1Toggle).toBeInTheDocument();
        expect(newsletter2Toggle).toBeInTheDocument();
        expect(newsletter1Toggle).not.toHaveClass('gh-portal-toggle-checked');
        expect(newsletter2Toggle).not.toHaveClass('gh-portal-toggle-checked');
    });

    describe('from the unsubscribe link > UnsubscribePage', () => {
        test('unsubscribe via email link while not logged in', async () => {
            // Mock window.location
            Object.defineProperty(window, 'location', {
                value: new URL(`https://portal.localhost/?action=unsubscribe&uuid=${FixtureMember.subbedToNewsletter.uuid}&newsletter=${Newsletters[0].uuid}`),
                writable: true
            });

            const {ghostApi, popupFrame, popupIframeDocument} = await setup({
                site: FixtureSite.singleTier.onlyFreePlanWithoutStripe,
                member: FixtureMember.subbedToNewsletter,
                newsletters: Newsletters
            }, true);

            expect(ghostApi.member.newsletters).toHaveBeenLastCalledWith(
                {uuid: FixtureMember.subbedToNewsletter.uuid}
            );
            expect(popupFrame).toBeInTheDocument();
            // Verify the local state shows the newsletter as unsubscribed
            let newsletterToggles = within(popupIframeDocument).queryAllByTestId('checkmark-container');
            let newsletter1Toggle = newsletterToggles[0];
            let newsletter2Toggle = newsletterToggles[1];

            expect(newsletter1Toggle).toBeInTheDocument();
            expect(newsletter2Toggle).toBeInTheDocument();
            expect(newsletter1Toggle).not.toHaveClass('gh-portal-toggle-checked');
            expect(newsletter2Toggle).toHaveClass('gh-portal-toggle-checked');
        });

        test('unsubscribe via email link while logged in', async () => {
            // Mock window.location
            Object.defineProperty(window, 'location', {
                value: new URL(`https://portal.localhost/?action=unsubscribe&uuid=${FixtureMember.subbedToNewsletter.uuid}&newsletter=${Newsletters[0].uuid}`),
                writable: true
            });

            const {ghostApi, popupFrame, popupIframeDocument, triggerButton, queryByTitle} = await setup({
                site: FixtureSite.singleTier.onlyFreePlanWithoutStripe,
                member: FixtureMember.subbedToNewsletter,
                newsletters: Newsletters
            });

            // Verify the API was hit to collect subscribed newsletters
            expect(ghostApi.member.newsletters).toHaveBeenLastCalledWith(
                {uuid: FixtureMember.subbedToNewsletter.uuid}
            );
            // Verify the local state shows the newsletter as unsubscribed
            let newsletterToggles = within(popupIframeDocument).queryAllByTestId('checkmark-container');
            let newsletter1Toggle = newsletterToggles[0];
            let newsletter2Toggle = newsletterToggles[1];

            expect(newsletter1Toggle).toBeInTheDocument();
            expect(newsletter2Toggle).toBeInTheDocument();
            expect(newsletter1Toggle).not.toHaveClass('gh-portal-toggle-checked');
            expect(newsletter2Toggle).toHaveClass('gh-portal-toggle-checked');

            // Close the UnsubscribePage popup frame
            const popupCloseButton = within(popupIframeDocument).queryByTestId('close-popup');
            await userEvent.click(popupCloseButton);
            expect(popupFrame).not.toBeInTheDocument();
            
            // Reopen Portal and go to the unsubscribe page
            await userEvent.click(triggerButton);
            // We have a new popup frame - can't use the old locator from setup
            const newPopupFrame = queryByTitle(/portal-popup/i);
            expect(newPopupFrame).toBeInTheDocument();
            const newPopupIframeDocument = newPopupFrame.contentDocument;
            
            // Open the NewsletterManagement page
            const manageSubscriptionsButton = within(newPopupIframeDocument).queryByRole('button', {name: 'Manage'});
            await userEvent.click(manageSubscriptionsButton);

            // Verify that the unsubscribed newsletter is shown as unsubscribed in the new popup
            newsletterToggles = within(newPopupIframeDocument).queryAllByTestId('checkmark-container');
            newsletter1Toggle = newsletterToggles[0];
            newsletter2Toggle = newsletterToggles[1];
            expect(newsletter1Toggle).toBeInTheDocument();
            expect(newsletter2Toggle).toBeInTheDocument();
            expect(newsletter1Toggle).not.toHaveClass('gh-portal-toggle-checked');
            expect(newsletter2Toggle).toHaveClass('gh-portal-toggle-checked');
        });
    });
});
