import {fireEvent, render} from '../../../../utils/test-utils';
import GiveGiftAction from '../../../../../src/components/pages/AccountHomePage/components/give-gift-action';
import {getMemberData, getSiteData, getProductsData, getSubscriptionData} from '../../../../../src/utils/fixtures-generator';

const setup = (overrides) => {
    const {mockDoActionFn, ...utils} = render(
        <GiveGiftAction />,
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

describe('GiveGiftAction', () => {
    test('renders for paid members when paid members are enabled', () => {
        const {queryByText} = setup({site: paidSite(), member: paidMember()});

        expect(queryByText('Gift a membership')).toBeInTheDocument();
        expect(queryByText('Gift')).toBeInTheDocument();
    });

    test('opens the gift page with account home as the previous page', () => {
        const {queryByText, mockDoActionFn} = setup({site: paidSite(), member: paidMember()});

        fireEvent.click(queryByText('Gift a membership'));

        expect(mockDoActionFn).toHaveBeenCalledWith('switchPage', {
            page: 'gift',
            lastPage: 'accountHome'
        });
    });

    test('renders for complimentary members', () => {
        const member = paidMember({status: 'comped'});

        const {queryByText} = setup({site: paidSite(), member});

        expect(queryByText('Gift a membership')).toBeInTheDocument();
    });

    test('does not render for free members', () => {
        const member = getMemberData({paid: false, status: 'free'});

        const {queryByText} = setup({site: paidSite(), member});

        expect(queryByText('Gift a membership')).not.toBeInTheDocument();
    });

    test('does not render for gift members', () => {
        const member = paidMember({status: 'gift'});

        const {queryByText} = setup({site: paidSite(), member});

        expect(queryByText('Gift a membership')).not.toBeInTheDocument();
    });

    test('does not render when paid members are disabled', () => {
        const {queryByText} = setup({site: paidSite({paidMembersEnabled: false}), member: paidMember()});

        expect(queryByText('Gift a membership')).not.toBeInTheDocument();
    });

    test('does not render when gift subscriptions are disabled', () => {
        const site = {...paidSite(), gift_subscriptions_enabled: false};

        const {queryByText} = setup({site, member: paidMember()});

        expect(queryByText('Gift a membership')).not.toBeInTheDocument();
    });

    test('does not render when no paid tiers are available', () => {
        const site = paidSite({products: [], portalProducts: []});

        const {queryByText} = setup({site, member: paidMember()});

        expect(queryByText('Gift a membership')).not.toBeInTheDocument();
    });
});
