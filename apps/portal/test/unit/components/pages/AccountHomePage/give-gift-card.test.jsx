import {fireEvent, render} from '../../../../utils/test-utils';
import GiveGiftCard from '../../../../../src/components/pages/AccountHomePage/components/give-gift-card';
import {getMemberData, getSiteData, getProductsData, getSubscriptionData} from '../../../../../src/utils/fixtures-generator';

const setup = (overrides) => {
    const {mockDoActionFn, ...utils} = render(
        <GiveGiftCard />,
        {
            overrideContext: {
                ...overrides
            }
        }
    );
    return {
        mockDoActionFn,
        ...utils
    };
};

const paidSite = (overrides = {}) => {
    const products = getProductsData({numOfProducts: 1});
    return getSiteData({products, portalProducts: products.map(p => p.id), ...overrides});
};

const paidMember = (overrides = {}) => {
    return getMemberData({
        paid: true,
        status: 'paid',
        subscriptions: [getSubscriptionData({status: 'active'})],
        ...overrides
    });
};

describe('GiveGiftCard', () => {
    test('renders for paid members when paid members are enabled', () => {
        const {queryByText} = setup({site: paidSite(), member: paidMember()});

        expect(queryByText('Gift membership')).toBeInTheDocument();
        expect(queryByText('For a friend or colleague')).toBeInTheDocument();
        expect(queryByText('Buy')).toBeInTheDocument();
    });

    test('opens the gift page with account home as the previous page', () => {
        const {getByRole, mockDoActionFn} = setup({site: paidSite(), member: paidMember()});

        fireEvent.click(getByRole('button'));

        expect(mockDoActionFn).toHaveBeenCalledWith('switchPage', {
            page: 'gift',
            lastPage: 'accountHome'
        });
    });

    test('renders for complimentary members', () => {
        const member = paidMember({status: 'comped'});

        const {queryByText} = setup({site: paidSite(), member});

        expect(queryByText('Gift membership')).toBeInTheDocument();
    });

    test('does not render for free members', () => {
        const member = getMemberData({paid: false, status: 'free'});

        const {queryByText} = setup({site: paidSite(), member});

        expect(queryByText('Gift membership')).not.toBeInTheDocument();
    });

    test('does not render for gift members', () => {
        const member = paidMember({status: 'gift'});

        const {queryByText} = setup({site: paidSite(), member});

        expect(queryByText('Gift membership')).not.toBeInTheDocument();
    });

    test('does not render when paid members are disabled', () => {
        const {queryByText} = setup({site: paidSite({paidMembersEnabled: false}), member: paidMember()});

        expect(queryByText('Gift membership')).not.toBeInTheDocument();
    });

    test('does not render when the account page gift option is disabled', () => {
        const site = {...paidSite(), portal_account_gift: false};

        const {queryByText} = setup({site, member: paidMember()});

        expect(queryByText('Gift membership')).not.toBeInTheDocument();
    });

    test('does not render when no paid tiers are available', () => {
        const site = paidSite({products: [], portalProducts: []});

        const {queryByText} = setup({site, member: paidMember()});

        expect(queryByText('Gift membership')).not.toBeInTheDocument();
    });

    test('does not render when every tier is disabled in gift settings', () => {
        const site = paidSite();
        site.gift_tiers_disabled = site.products.filter(p => p.type === 'paid').map(p => p.id);

        const {queryByText} = setup({site, member: paidMember()});

        expect(queryByText('Gift membership')).not.toBeInTheDocument();
    });

    test('does not render when no gift durations are offered', () => {
        const site = {...paidSite(), gift_durations: []};

        const {queryByText} = setup({site, member: paidMember()});

        expect(queryByText('Gift membership')).not.toBeInTheDocument();
    });
});
