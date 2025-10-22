import App from '../App.js';
import {appRender, fireEvent, within, waitFor} from '../utils/test-utils';
import {newsletters as Newsletters, site as FixtureSite, member as FixtureMember} from '../utils/test-fixtures';
import setupGhostApi from '../utils/api.js';
import userEvent from '@testing-library/user-event';

const setup = async ({site, member = null, newsletters}, loggedOut = false) => {
    const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
    ghostApi.init = vi.fn(() => {
        return Promise.resolve({
            site,
            member: loggedOut ? null : member,
            newsletters
        });
    });

    ghostApi.member.update = vi.fn(({newsletters: newNewsletters}) => {
        return Promise.resolve({
            newsletters: newNewsletters,
            enable_comment_notifications: false
        });
    });

    ghostApi.member.newsletters = vi.fn(() => {
        return Promise.resolve({
            newsletters
        });
    });

    ghostApi.member.updateNewsletters = vi.fn(({uuid: memberUuid, newsletters: newNewsletters, enableCommentNotifications}) => {
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
    // Wait for trigger button to render
    const triggerButton = await within(triggerButtonFrame.contentDocument).findByTestId('portal-trigger-button');

    const popupFrame = await utils.findByTitle(/portal-popup/i);
    const popupIframeDocument = popupFrame.contentDocument;

    // Wait for content to render - try site title or account home title
    let siteTitle, accountHomeTitle;
    try {
        siteTitle = await within(popupIframeDocument).findByText(site.title, {}, {timeout: 500});
    } catch (e) {
        try {
            accountHomeTitle = await within(popupIframeDocument).findByText('Your account', {}, {timeout: 500});
        } catch (e2) {
            siteTitle = within(popupIframeDocument).queryByText(site.title);
            accountHomeTitle = within(popupIframeDocument).queryByText('Your account');
        }
    }
    if (!accountHomeTitle) {
        accountHomeTitle = within(popupIframeDocument).queryByText('Your account');
    }
    if (!siteTitle) {
        siteTitle = within(popupIframeDocument).queryByText(site.title);
    }

    const emailInput = within(popupIframeDocument).queryByLabelText(/email/i);
    const nameInput = within(popupIframeDocument).queryByLabelText(/name/i);
    const submitButton = within(popupIframeDocument).queryByRole('button', {name: 'Continue'});
    const signinButton = within(popupIframeDocument).queryByRole('button', {name: 'Sign in'});
    const freePlanTitle = within(popupIframeDocument).queryByText('Free');
    const monthlyPlanTitle = within(popupIframeDocument).queryByText('Monthly');
    const yearlyPlanTitle = within(popupIframeDocument).queryByText('Yearly');
    const fullAccessTitle = within(popupIframeDocument).queryByText('Full access');
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

        await waitFor(() => {
            const newsletter1 = within(popupIframeDocument).queryByText('Newsletter 1');
            const newsletter2 = within(popupIframeDocument).queryByText('Newsletter 2');
            const emailPreferences = within(popupIframeDocument).queryByText('Email preferences');

            // within(popupIframeDocument).getByText('dslkfjsdlk');
            expect(newsletter1).toBeInTheDocument();
            expect(newsletter2).toBeInTheDocument();
            expect(emailPreferences).toBeInTheDocument();
        });
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

        await waitFor(() => {
            const newsletter1 = within(popupIframeDocument).queryByText('Newsletter 1');
            expect(newsletter1).toBeInTheDocument();
        });

        // unsubscribe from Newsletter 1
        const subscriptionToggles = within(popupIframeDocument).getAllByTestId('switch-input');
        const newsletter1Toggle = subscriptionToggles[0];
        expect(newsletter1Toggle).toBeInTheDocument();
        await userEvent.click(newsletter1Toggle);

        // verify that subscription to Newsletter 1 was removed
        await waitFor(() => {
            const expectedSubscriptions = Newsletters.filter(n => n.id !== Newsletters[0].id).map(n => ({id: n.id}));
            expect(ghostApi.member.update).toHaveBeenLastCalledWith(
                {newsletters: expectedSubscriptions}
            );
        });

        await waitFor(() => {
            const checkboxes = within(popupIframeDocument).getAllByRole('checkbox');
            const newsletter1Checkbox = checkboxes[0];
            const newsletter2Checkbox = checkboxes[1];

            expect(newsletter1Checkbox).not.toBeChecked();
            expect(newsletter2Checkbox).toBeChecked();
        });

        // resubscribe to Newsletter 1
        await userEvent.click(newsletter1Toggle);

        await waitFor(() => {
            const checkboxes = within(popupIframeDocument).getAllByRole('checkbox');
            const newsletter1Checkbox = checkboxes[0];
            expect(newsletter1Checkbox).toBeChecked();
            expect(ghostApi.member.update).toHaveBeenLastCalledWith(
                {newsletters: Newsletters.reverse().map(n => ({id: n.id}))}
            );
        });
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

        await waitFor(() => {
            const unsubscribeAllButton = within(popupIframeDocument).queryByRole('button', {name: 'Unsubscribe from all emails'});
            expect(unsubscribeAllButton).toBeInTheDocument();
        });

        const unsubscribeAllButton = within(popupIframeDocument).queryByRole('button', {name: 'Unsubscribe from all emails'});
        await userEvent.click(unsubscribeAllButton);

        await waitFor(() => {
            expect(ghostApi.member.update).toHaveBeenCalledWith({newsletters: [], enableCommentNotifications: false});
        });

        // Wait for state update to reflect in checkboxes
        await waitFor(() => {
            const checkboxes = within(popupIframeDocument).getAllByRole('checkbox');
            const newsletter1Checkbox = checkboxes[0];
            const newsletter2Checkbox = checkboxes[1];

            expect(newsletter1Checkbox).not.toBeChecked();
            expect(newsletter2Checkbox).not.toBeChecked();
        });
    });

    describe('from the unsubscribe link > UnsubscribePage', () => {
        test('unsubscribe via email link while not logged in', async () => {
            // Mock window.location
            Object.defineProperty(window, 'location', {
                value: new URL(`https://portal.localhost/?action=unsubscribe&uuid=${FixtureMember.subbedToNewsletter.uuid}&newsletter=${Newsletters[0].uuid}&key=hashedMemberUuid`),
                writable: true
            });

            const {ghostApi, popupFrame, popupIframeDocument} = await setup({
                site: FixtureSite.singleTier.onlyFreePlanWithoutStripe,
                member: FixtureMember.subbedToNewsletter,
                newsletters: Newsletters
            }, true);

            // Verify the API was hit to collect subscribed newsletters
            expect(ghostApi.member.newsletters).toHaveBeenLastCalledWith(
                {
                    uuid: FixtureMember.subbedToNewsletter.uuid,
                    key: 'hashedMemberUuid'
                }
            );
            expect(popupFrame).toBeInTheDocument();

            expect(within(popupIframeDocument).getByText(/will no longer receive/)).toBeInTheDocument();
            // Verify the local state shows the newsletter as unsubscribed
            const checkboxes = within(popupIframeDocument).getAllByRole('checkbox');
            const newsletter1Checkbox = checkboxes[0];
            const newsletter2Checkbox = checkboxes[1];

            expect(newsletter1Checkbox).not.toBeChecked();
            expect(newsletter2Checkbox).toBeChecked();
        });

        test('unsubscribe via email link while logged in', async () => {
            // Mock window.location
            Object.defineProperty(window, 'location', {
                value: new URL(`https://portal.localhost/?action=unsubscribe&uuid=${FixtureMember.subbedToNewsletter.uuid}&newsletter=${Newsletters[0].uuid}&key=hashedMemberUuid`),
                writable: true
            });

            const {ghostApi, popupFrame, popupIframeDocument, triggerButton, queryByTitle} = await setup({
                site: FixtureSite.singleTier.onlyFreePlanWithoutStripe,
                member: FixtureMember.subbedToNewsletter,
                newsletters: Newsletters
            });

            // Verify the API was hit to collect subscribed newsletters
            expect(ghostApi.member.newsletters).toHaveBeenLastCalledWith(
                {
                    uuid: FixtureMember.subbedToNewsletter.uuid,
                    key: 'hashedMemberUuid'
                }
            );

            // Wait for the unsubscribe message and checkboxes to render
            let checkboxes, newsletter1Checkbox, newsletter2Checkbox;
            await waitFor(() => {
                expect(within(popupIframeDocument).getByText(/will no longer receive/)).toBeInTheDocument();
                checkboxes = within(popupIframeDocument).getAllByRole('checkbox');
                expect(checkboxes.length).toBeGreaterThanOrEqual(2);
            });

            // Verify the local state shows the newsletter as unsubscribed
            newsletter1Checkbox = checkboxes[0];
            newsletter2Checkbox = checkboxes[1];

            expect(newsletter1Checkbox).not.toBeChecked();
            expect(newsletter2Checkbox).toBeChecked();

            // Close the UnsubscribePage popup frame
            const popupCloseButton = within(popupIframeDocument).queryByTestId('close-popup');
            await userEvent.click(popupCloseButton);
            expect(popupFrame).not.toBeInTheDocument();

            // Reopen Portal and go to the unsubscribe page
            await userEvent.click(triggerButton);
            // We have a new popup frame - can't use the old locator from setup
            const newPopupFrame = await waitFor(() => {
                const frame = queryByTitle(/portal-popup/i);
                expect(frame).toBeInTheDocument();
                return frame;
            });
            const newPopupIframeDocument = newPopupFrame.contentDocument;

            // Wait for account page and manage button to render
            const manageSubscriptionsButton = await within(newPopupIframeDocument).findByRole('button', {name: 'Manage'});
            await userEvent.click(manageSubscriptionsButton);

            // Wait for checkboxes to render after clicking manage
            await waitFor(() => {
                checkboxes = within(newPopupIframeDocument).getAllByRole('checkbox');
                expect(checkboxes.length).toBeGreaterThanOrEqual(2);
            });

            // Verify that the unsubscribed newsletter is shown as unsubscribed in the new popup
            newsletter1Checkbox = checkboxes[0];
            newsletter2Checkbox = checkboxes[1];
            expect(newsletter1Checkbox).not.toBeChecked();
            expect(newsletter2Checkbox).toBeChecked();
        });

        test('unsubscribe link without a key param', async () => {
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

            // Verify the popup frame is not shown
            expect(popupFrame).toBeInTheDocument();
            // Verify the API was hit to collect subscribed newsletters
            expect(ghostApi.member.newsletters).not.toHaveBeenCalled();
            // expect sign in page
            expect(within(popupIframeDocument).queryByText('Sign in')).toBeInTheDocument();
        });
    });
});
