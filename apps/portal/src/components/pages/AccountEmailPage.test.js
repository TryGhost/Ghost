import {getSiteData, getNewslettersData, getMemberData} from '../../utils/fixtures-generator';
import {render, fireEvent} from '../../utils/test-utils';
import AccountEmailPage from './AccountEmailPage';

const setup = (overrides) => {
    const {mockOnActionFn, context, ...utils} = render(
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
        mockOnActionFn,
        context,
        ...utils
    };
};

describe('Account Email Page', () => {
    test('renders', () => {
        const newsletterData = getNewslettersData({numOfNewsletters: 2});
        const siteData = getSiteData({
            newsletters: newsletterData,
            member: getMemberData({newsletters: newsletterData})
        });
        const {unsubscribeAllBtn, getAllByTestId, getByText} = setup({site: siteData});
        const unsubscribeBtns = getAllByTestId(`toggle-wrapper`);
        expect(getByText('Email preferences')).toBeInTheDocument();
        // one for each newsletter and one for comments
        expect(unsubscribeBtns).toHaveLength(3);
        expect(unsubscribeAllBtn).toBeInTheDocument();
    });

    test('can unsubscribe from all emails', async () => {
        const newsletterData = getNewslettersData({numOfNewsletters: 2});
        const siteData = getSiteData({
            newsletters: newsletterData
        });
        const {mockOnActionFn, unsubscribeAllBtn, getAllByRole} = setup({site: siteData, member: getMemberData({newsletters: newsletterData})});
        let checkboxes = getAllByRole('checkbox');
        let newsletter1Checkbox = checkboxes[0];
        let newsletter2Checkbox = checkboxes[1];
        // each newsletter should have the checked class (this is how we know they're enabled/subscribed to)
        expect(newsletter1Checkbox).toBeChecked();
        expect(newsletter2Checkbox).toBeChecked();

        fireEvent.click(unsubscribeAllBtn);
        expect(mockOnActionFn).toHaveBeenCalledTimes(2);
        expect(mockOnActionFn).toHaveBeenCalledWith('showPopupNotification', {action: 'updated:success', message: 'Unsubscribed from all emails.'});
        expect(mockOnActionFn).toHaveBeenLastCalledWith('updateNewsletterPreference', {newsletters: [], enableCommentNotifications: false});

        checkboxes = getAllByRole('checkbox');
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
        const {mockOnActionFn, getAllByTestId, getAllByRole} = setup({site: siteData, member: getMemberData({newsletters: newsletterData})});
        let checkboxes = getAllByRole('checkbox');
        let newsletter1Checkbox = checkboxes[0];
        // each newsletter should have the checked class (this is how we know they're enabled/subscribed to)
        expect(newsletter1Checkbox).toBeChecked();
        let subscriptionToggles = getAllByTestId('switch-input');
        fireEvent.click(subscriptionToggles[0]);
        expect(mockOnActionFn).toHaveBeenCalledWith('updateNewsletterPreference', {newsletters: [{id: newsletterData[1].id}]});
        fireEvent.click(subscriptionToggles[0]);
        expect(mockOnActionFn).toHaveBeenCalledWith('updateNewsletterPreference', {newsletters: [{id: newsletterData[1].id}, {id: newsletterData[0].id}]});
    });

    test('can update comment notifications', async () => {
        const siteData = getSiteData();
        const {mockOnActionFn, getAllByTestId} = setup({site: siteData, member: getMemberData()});
        let subscriptionToggles = getAllByTestId('switch-input');
        fireEvent.click(subscriptionToggles[0]);
        expect(mockOnActionFn).toHaveBeenCalledWith('updateNewsletterPreference', {enableCommentNotifications: true});
        fireEvent.click(subscriptionToggles[0]);
        expect(mockOnActionFn).toHaveBeenCalledWith('updateNewsletterPreference', {enableCommentNotifications: false});
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
        const {mockOnActionFn} = setup({site: siteData, member: null});
        expect(mockOnActionFn).toHaveBeenCalledWith('switchPage', {page: 'signin'});
    });
});
