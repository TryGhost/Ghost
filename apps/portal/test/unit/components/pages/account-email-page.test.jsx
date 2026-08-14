import {getSiteData, getNewslettersData, getMemberData} from '../../../../src/utils/fixtures-generator';
import {render, fireEvent} from '../../../utils/test-utils';
import AccountEmailPage from '../../../../src/components/pages/account-email-page';

const setup = (overrides) => {
    const {mockDoActionFn, context, ...utils} = render(
        <AccountEmailPage />,
        {
            overrideContext: {
                ...overrides
            }
        }
    );
    const unsubscribeAllBtn = utils.getByText('Unsubscribe from all emails');
    const closeBtn = utils.getByTestId('close-popup');

    return {
        unsubscribeAllBtn,
        closeBtn,
        mockDoActionFn,
        context,
        ...utils
    };
};

const getEmailPreferenceToggles = ({queryAllByTestId}) => {
    return [
        ...queryAllByTestId('newsletter-toggle'),
        ...queryAllByTestId('comment-toggle')
    ];
};

describe('Account Email Page', () => {
    test('renders', () => {
        const newsletterData = getNewslettersData({numOfNewsletters: 2});
        const siteData = getSiteData({
            newsletters: newsletterData,
            member: getMemberData({newsletters: newsletterData})
        });
        const {unsubscribeAllBtn, queryAllByTestId, getByText} = setup({site: siteData});
        const unsubscribeBtns = getEmailPreferenceToggles({queryAllByTestId});
        expect(getByText('Email preferences')).toBeInTheDocument();
        // one for each newsletter and one for comments
        expect(unsubscribeBtns).toHaveLength(3);
        expect(unsubscribeAllBtn).toBeInTheDocument();
    });

    test('orders Back before Close in keyboard navigation', () => {
        const siteData = getSiteData();
        const {getByRole} = setup({
            site: siteData,
            member: getMemberData(),
            lastPage: 'accountHome'
        });

        const backBtn = getByRole('button', {name: 'Back'});
        const closeBtn = getByRole('button', {name: 'Close popup'});

        expect(backBtn.compareDocumentPosition(closeBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    test('uses the site accent color for the Close button', () => {
        const siteData = getSiteData();
        const {getByTestId} = setup({
            site: siteData,
            brandColor: '#ff0099',
            member: getMemberData()
        });

        const closeIcon = getByTestId('close-popup').querySelector('.gh-portal-closeicon');
        expect(closeIcon).toHaveStyle({color: '#ff0099'});
    });

    test('can unsubscribe from all emails', async () => {
        const newsletterData = getNewslettersData({numOfNewsletters: 2});
        const siteData = getSiteData({
            newsletters: newsletterData
        });
        const {mockDoActionFn, unsubscribeAllBtn, container} = setup({site: siteData, member: getMemberData({newsletters: newsletterData})});
        let checkboxes = container.querySelectorAll('input[type="checkbox"]');
        let newsletter1Checkbox = checkboxes[0];
        let newsletter2Checkbox = checkboxes[1];
        // each newsletter should have the checked class (this is how we know they're enabled/subscribed to)
        expect(newsletter1Checkbox).toBeChecked();
        expect(newsletter2Checkbox).toBeChecked();

        fireEvent.click(unsubscribeAllBtn);
        expect(mockDoActionFn).toHaveBeenCalledTimes(2);
        expect(mockDoActionFn).toHaveBeenCalledWith('showPopupNotification', {action: 'updated:success', message: 'Unsubscribed from all emails.'});
        expect(mockDoActionFn).toHaveBeenLastCalledWith('updateNewsletterPreference', {newsletters: [], enableCommentNotifications: false});

        checkboxes = container.querySelectorAll('input[type="checkbox"]');
        expect(checkboxes).toHaveLength(3);
        checkboxes.forEach((checkbox) => {
            // each newsletter htmlElement should not have the checked class
            expect(checkbox).not.toBeChecked();
        });
    });

    test('unsubscribe all is disabled when no newsletters are subscribed to', async () => {
        const siteData = getSiteData({
            newsletters: getNewslettersData({numOfNewsletters: 2})
        });
        const {unsubscribeAllBtn} = setup({site: siteData, member: getMemberData()});
        expect(unsubscribeAllBtn).toBeDisabled();
    });

    test('can update newsletter preferences', async () => {
        const newsletterData = getNewslettersData({numOfNewsletters: 2});
        const siteData = getSiteData({
            newsletters: newsletterData
        });
        const {mockDoActionFn, getAllByTestId, container} = setup({site: siteData, member: getMemberData({newsletters: newsletterData})});
        let checkboxes = container.querySelectorAll('input[type="checkbox"]');
        let newsletter1Checkbox = checkboxes[0];
        // each newsletter should have the checked class (this is how we know they're enabled/subscribed to)
        expect(newsletter1Checkbox).toBeChecked();
        let subscriptionToggles = getAllByTestId('switch-input');
        fireEvent.click(subscriptionToggles[0]);
        expect(mockDoActionFn).toHaveBeenCalledWith('updateNewsletterPreference', {newsletters: [{id: newsletterData[1].id}]});
        fireEvent.click(subscriptionToggles[0]);
        expect(mockDoActionFn).toHaveBeenCalledWith('updateNewsletterPreference', {newsletters: [{id: newsletterData[1].id}, {id: newsletterData[0].id}]});
    });

    test('can update comment notifications', async () => {
        const siteData = getSiteData();
        // The row is the single accessible toggle; it derives the next value
        // from the parent prop (member.enable_comment_notifications), not from
        // the inner checkbox's local state. So the dispatched value flips when
        // the parent prop flips between renders.
        const memberOff = {...getMemberData(), enable_comment_notifications: false};
        const {mockDoActionFn: mockA, getAllByTestId: getA, unmount} = setup({site: siteData, member: memberOff});
        fireEvent.click(getA('switch-input')[0]);
        expect(mockA).toHaveBeenCalledWith('updateNewsletterPreference', {enableCommentNotifications: true});
        unmount();

        const memberOn = {...getMemberData(), enable_comment_notifications: true};
        const {mockDoActionFn: mockB, getAllByTestId: getB} = setup({site: siteData, member: memberOn});
        fireEvent.click(getB('switch-input')[0]);
        expect(mockB).toHaveBeenCalledWith('updateNewsletterPreference', {enableCommentNotifications: false});
    });

    test('displays help for members with email suppressions', async () => {
        const newsletterData = getNewslettersData({numOfNewsletters: 2});
        const siteData = getSiteData({
            newsletters: newsletterData
        });
        const {getByText} = setup({site: siteData, member: getMemberData({newsletters: newsletterData, email_suppressions: {suppressed: false}})});
        expect(getByText('Not receiving emails?')).toBeInTheDocument();
        expect(getByText('Get help')).toBeInTheDocument();
    });

    test('redirects to signin page if no member', async () => {
        const newsletterData = getNewslettersData({numOfNewsletters: 2});
        const siteData = getSiteData({
            newsletters: newsletterData
        });
        const {mockDoActionFn} = setup({site: siteData, member: null});
        expect(mockDoActionFn).toHaveBeenCalledWith('switchPage', {page: 'signin'});
    });

    test('newsletters are not visible when newsletters are disabled on the site but has comments enabled', async () => {
        const newsletterData = getNewslettersData({numOfNewsletters: 2});
        const siteData = getSiteData({
            newsletters: newsletterData,
            editorDefaultEmailRecipients: 'disabled',
            member: getMemberData({newsletters: newsletterData})
        });

        const {queryAllByTestId, getByText} = setup({site: siteData});
        const unsubscribeBtns = getEmailPreferenceToggles({queryAllByTestId});

        expect(getByText('Email preferences')).toBeInTheDocument();

        expect(unsubscribeBtns).toHaveLength(1);
        expect(unsubscribeBtns[0].textContent).toContain('Get notified when someone replies to your comment');
    });

    test('newsletters are visible when editor default email recipients is set to visibility', async () => {
        const newsletterData = getNewslettersData({numOfNewsletters: 2});
        const siteData = getSiteData({
            newsletters: newsletterData,
            editorDefaultEmailRecipients: 'visibility',
            member: getMemberData({newsletters: newsletterData})
        });
        const {queryAllByTestId} = setup({site: siteData});
        const unsubscribeBtns = getEmailPreferenceToggles({queryAllByTestId});
        expect(unsubscribeBtns).toHaveLength(3);
    });

    test('newsletters are visible when editor default email recipients is set to filter', async () => {
        const newsletterData = getNewslettersData({numOfNewsletters: 2});
        const siteData = getSiteData({
            newsletters: newsletterData,
            editorDefaultEmailRecipients: 'filter',
            member: getMemberData({newsletters: newsletterData})
        });
        const {queryAllByTestId} = setup({site: siteData});
        const unsubscribeBtns = getEmailPreferenceToggles({queryAllByTestId});
        expect(unsubscribeBtns).toHaveLength(3);
    });

    test('newsletter row is keyboard-activatable and toggles the subscription', async () => {
        const newsletterData = getNewslettersData({numOfNewsletters: 2});
        const siteData = getSiteData({
            newsletters: newsletterData
        });
        const {mockDoActionFn, getAllByTestId} = setup({site: siteData, member: getMemberData({newsletters: newsletterData})});

        const newsletterRows = getAllByTestId('newsletter-toggle');
        expect(newsletterRows[0]).toHaveAttribute('role', 'button');
        expect(newsletterRows[0]).toHaveAttribute('tabindex', '0');

        fireEvent.keyDown(newsletterRows[0], {key: 'Enter'});
        expect(mockDoActionFn).toHaveBeenCalledWith('updateNewsletterPreference', {newsletters: [{id: newsletterData[1].id}]});

        mockDoActionFn.mockClear();
        fireEvent.keyDown(newsletterRows[0], {key: ' '});
        expect(mockDoActionFn).toHaveBeenCalledWith('updateNewsletterPreference', {newsletters: [{id: newsletterData[1].id}, {id: newsletterData[0].id}]});

        mockDoActionFn.mockClear();
        fireEvent.keyDown(newsletterRows[0], {key: 'Escape'});
        expect(mockDoActionFn).not.toHaveBeenCalled();
    });

    test('clicking the section surface (not the switch) toggles the newsletter', async () => {
        const newsletterData = getNewslettersData({numOfNewsletters: 2});
        const siteData = getSiteData({
            newsletters: newsletterData
        });
        const {mockDoActionFn, getAllByTestId} = setup({site: siteData, member: getMemberData({newsletters: newsletterData})});

        const newsletterRows = getAllByTestId('newsletter-toggle');
        fireEvent.click(newsletterRows[0]);
        expect(mockDoActionFn).toHaveBeenCalledWith('updateNewsletterPreference', {newsletters: [{id: newsletterData[1].id}]});
    });

    test('clicking the inner switch does not double-fire the section toggle', async () => {
        const newsletterData = getNewslettersData({numOfNewsletters: 2});
        const siteData = getSiteData({
            newsletters: newsletterData
        });
        const {mockDoActionFn, getAllByTestId} = setup({site: siteData, member: getMemberData({newsletters: newsletterData})});

        const switches = getAllByTestId('switch-input');
        fireEvent.click(switches[0]);

        const updateCalls = mockDoActionFn.mock.calls.filter(call => call[0] === 'updateNewsletterPreference');
        expect(updateCalls).toHaveLength(1);
        expect(updateCalls[0][1]).toEqual({newsletters: [{id: newsletterData[1].id}]});
    });

    test('comments row is keyboard-activatable', async () => {
        const siteData = getSiteData();
        const {mockDoActionFn, getByTestId} = setup({site: siteData, member: getMemberData()});

        const commentsRow = getByTestId('comment-toggle');
        expect(commentsRow).toHaveAttribute('role', 'button');
        expect(commentsRow).toHaveAttribute('tabindex', '0');

        fireEvent.keyDown(commentsRow, {key: 'Enter'});
        expect(mockDoActionFn).toHaveBeenCalledWith('updateNewsletterPreference', {enableCommentNotifications: true});
    });

    test('toggle rows expose aria-pressed matching the subscribed state', () => {
        const newsletterData = getNewslettersData({numOfNewsletters: 2});
        const siteData = getSiteData({newsletters: newsletterData});
        // Only the first newsletter is subscribed; comments are off by default.
        const member = {
            ...getMemberData({newsletters: [newsletterData[0]]}),
            enable_comment_notifications: false
        };
        const {getAllByTestId, getByTestId} = setup({site: siteData, member});

        const newsletterRows = getAllByTestId('newsletter-toggle');
        expect(newsletterRows[0]).toHaveAttribute('aria-pressed', 'true');
        expect(newsletterRows[1]).toHaveAttribute('aria-pressed', 'false');

        const commentsRow = getByTestId('comment-toggle');
        expect(commentsRow).toHaveAttribute('aria-pressed', 'false');
    });

    test('toggle row Switches are hidden from screen readers and the focus order', () => {
        const newsletterData = getNewslettersData({numOfNewsletters: 2});
        const siteData = getSiteData({newsletters: newsletterData});
        const {container} = setup({site: siteData, member: getMemberData({newsletters: newsletterData})});

        const switchWrappers = container.querySelectorAll('.gh-portal-for-switch');
        expect(switchWrappers.length).toBeGreaterThan(0);
        switchWrappers.forEach((wrapper) => {
            expect(wrapper).toHaveAttribute('aria-hidden', 'true');
        });

        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        expect(checkboxes.length).toBeGreaterThan(0);
        checkboxes.forEach((checkbox) => {
            expect(checkbox).toHaveAttribute('tabindex', '-1');
        });
    });
});
