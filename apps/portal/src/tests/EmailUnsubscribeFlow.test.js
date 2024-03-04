import App from '../App.js';
import {appRender, within} from '../utils/test-utils';
import {newsletters as Newsletters, site as FixtureSite, member as FixtureMember} from '../utils/test-fixtures';
import setupGhostApi from '../utils/api.js';
import userEvent from '@testing-library/user-event';
import {prettyDOM, screen, waitFor} from '@testing-library/react';

const setup = async ({site, member = null, newsletters}, loggedIn) => {
    const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
    ghostApi.init = jest.fn(() => {
        return Promise.resolve({
            site,
            member: loggedIn ? member : null,
            newsletters
        });
    });

    ghostApi.member.update = jest.fn(() => {
        return Promise.resolve({
            newsletters: [],
            enable_comment_notifications: false
        });
    });

    ghostApi.member.newsletters = jest.fn(() => {
        return Promise.resolve({
            ...FixtureMember.subbedToNewsletter
        });
    });

    const utils = appRender(
        <App api={ghostApi} />
    );

    const triggerButtonFrame = await utils.findByTitle(/portal-trigger/i);
    const popupFrame = utils.queryByTitle(/portal-popup/i);
    const popupIframeDocument = popupFrame.contentDocument;
    const manageSubscriptionsButton = within(popupIframeDocument).queryByRole('button', {name: 'Manage'});
    return {
        ghostApi,
        popupIframeDocument,
        popupFrame,
        triggerButtonFrame,
        manageSubscriptionsButton,
        ...utils
    };
};

describe('Unsubscripe From Email', () => {
    // NOTE: This endpoint isn't defined yet, so this test will fail - this should parse the query params to make a call to the Ghost API (newsletter)
    //  and then display the UnsubscribePage component in the iframe.
    test('unsubscribe via email link while not logged in', async () => {
        // Mock window.location
        Object.defineProperty(window, 'location', {
            value: new URL(`https://portal.localhost/?action=unsubscribe&uuid=${FixtureMember.subbedToNewsletter.uuid}&newsletter=${Newsletters[0].id}`),
            writable: true
        });

        const {ghostApi, popupFrame} = await setup({
            site: FixtureSite.singleTier.onlyFreePlanWithoutStripe,
            member: FixtureMember.subbedToNewsletter,
            newsletters: Newsletters
        });

        expect(ghostApi.member.newsletters).toHaveBeenLastCalledWith(
            {uuid: FixtureMember.subbedToNewsletter.uuid}
        );
        expect(popupFrame).toBeInTheDocument();
    });

    test('unsubscribe via email link while logged in', async () => {
        // Mock window.location
        Object.defineProperty(window, 'location', {
            value: new URL(`https://portal.localhost/?action=unsubscribe&uuid=${FixtureMember.subbedToNewsletter.uuid}&newsletter=${Newsletters[0].id}`),
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

        const popupCloseButton = within(popupIframeDocument).queryByTestId('close-popup');

        // TODO: Clicking the close button doesn't seem to be closing the popup.
        userEvent.click(popupCloseButton);

        await expect(popupFrame).not.toBeInTheDocument();
        
        // screen.debug();
    });
});