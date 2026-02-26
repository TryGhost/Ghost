import {render, fireEvent} from '../../../../utils/test-utils';
import AccountHomePage from '../../../../../src/components/pages/AccountHomePage/account-home-page';
import {site} from '../../../../../src/utils/fixtures';
import {getDiscountData, getMemberData, getNewslettersData, getNextPaymentData, getProductsData, getSiteData, getSubscriptionData} from '../../../../../src/utils/fixtures-generator';

const setup = (overrides) => {
    const {mockDoActionFn, ...utils} = render(
        <AccountHomePage />,
        {
            overrideContext: {
                ...overrides
            }
        }
    );
    const logoutBtn = utils.queryByRole('button', {name: 'logout'});
    return {
        logoutBtn,
        mockDoActionFn,
        utils
    };
};

describe('Account Home Page', () => {
    test('renders', () => {
        const siteData = getSiteData({commentsEnabled: 'off'});
        const {logoutBtn, utils} = setup({site: siteData});
        expect(logoutBtn).toBeInTheDocument();
        expect(utils.queryByText('You\'re currently not receiving emails')).not.toBeInTheDocument();
        expect(utils.queryByText('Email newsletter')).toBeInTheDocument();
    });

    test('can call signout', () => {
        const {mockDoActionFn, logoutBtn} = setup();

        fireEvent.click(logoutBtn);
        expect(mockDoActionFn).toHaveBeenCalledWith('signout');
    });

    test('shows free months renewal date based on the paid billing date', () => {
        const products = getProductsData({numOfProducts: 1});
        const siteData = getSiteData({products, portalProducts: products.map(p => p.id)});
        const currentPeriodEnd = new Date('2099-01-01T12:00:00.000Z');
        const discountEnd = new Date('2099-01-01T12:00:00.000Z');

        const member = getMemberData({
            paid: true,
            subscriptions: [
                getSubscriptionData({
                    status: 'active',
                    amount: 500,
                    currency: 'USD',
                    interval: 'month',
                    offer: {
                        type: 'percent',
                        amount: 100,
                        duration: 'repeating',
                        duration_in_months: 1,
                        redemption_type: 'retention'
                    },
                    currentPeriodEnd: currentPeriodEnd.toISOString(),
                    nextPayment: getNextPaymentData({
                        originalAmount: 500,
                        amount: 500,
                        interval: 'month',
                        currency: 'USD',
                        discount: getDiscountData({
                            duration: 'repeating',
                            type: 'percent',
                            amount: 100,
                            end: discountEnd.toISOString()
                        })
                    })
                })
            ]
        });

        const {utils} = setup({site: siteData, member});

        expect(utils.queryByText('Your subscription will renew on 1 Feb 2099')).toBeInTheDocument();
    });

    test('can show Manage button for few newsletters', () => {
        const {mockDoActionFn, utils} = setup({site: site});

        expect(utils.queryByText('Update your preferences')).toBeInTheDocument();
        expect(utils.queryByText('You\'re currently not receiving emails')).not.toBeInTheDocument();

        const manageBtn = utils.queryByRole('button', {name: 'Manage'});
        expect(manageBtn).toBeInTheDocument();

        fireEvent.click(manageBtn);
        expect(mockDoActionFn).toHaveBeenCalledWith('switchPage', {lastPage: 'accountHome', page: 'accountEmail'});
    });

    test('hides Newsletter toggle if newsletters are disabled', () => {
        const siteData = getSiteData({editorDefaultEmailRecipients: 'disabled'});
        const {logoutBtn, utils} = setup({site: siteData});
        expect(logoutBtn).toBeInTheDocument();
        expect(utils.queryByText('Email newsletter')).not.toBeInTheDocument();
    });

    test('newsletter settings is not visible when newsletters are disabled and comments are disabled', async () => {
        const siteData = getSiteData({
            editorDefaultEmailRecipients: 'disabled',
            commentsEnabled: 'off'
        });

        const {utils} = setup({site: siteData});

        expect(utils.queryByText('Email preferences')).not.toBeInTheDocument();
    });

    test('Email preferences / settings is visible when newsletters are disabled and comments are enabled', async () => {
        const newsletterData = getNewslettersData({numOfNewsletters: 2});
        const siteData = getSiteData({
            newsletters: newsletterData,
            editorDefaultEmailRecipients: 'disabled',
            commentsEnabled: 'all'
        });

        const {utils} = setup({site: siteData});

        expect(utils.queryByText('Emails')).toBeInTheDocument();
        expect(utils.queryByText('Update your preferences')).toBeInTheDocument();
        expect(utils.queryByText('Newsletters')).not.toBeInTheDocument(); // there should be no sign of newsletters
    });
});
