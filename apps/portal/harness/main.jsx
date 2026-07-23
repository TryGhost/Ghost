import React from 'react';
import ReactDOM from 'react-dom';
import App from '../src/app';
import setupGhostApi from '../src/utils/api';
import {site as FixtureSite, member as FixtureMember} from '../test/utils/test-fixtures';
import {getMemberData, getSubscriptionData} from '../src/utils/fixtures-generator';

const personas = {
    none: null,
    free: FixtureMember.free,
    paid: FixtureMember.paid,
    comped: FixtureMember.complimentary,
    gift: getMemberData({
        name: 'Jamie Larson',
        email: 'jamie@example.com',
        firstname: 'Jamie',
        paid: true,
        status: 'gift',
        subscriptions: [getSubscriptionData({
            status: 'active',
            amount: 0,
            currentPeriodEnd: '2026-11-04T11:00:00.000Z',
            tier: {
                id: FixtureSite.singleTier.basic.products.find(p => p.type === 'paid')?.id,
                expiry_at: '2026-11-04T11:00:00.000Z'
            }
        })]
    })
};

const searchParams = new URLSearchParams(window.location.search);
const personaKey = searchParams.get('member') || 'paid';
const member = personas[personaKey] ?? personas.paid;

const site = {
    ...FixtureSite.singleTier.basic,
    title: 'Grasslands',
    ...(searchParams.get('gifts') === 'off' ? {gift_subscriptions_enabled: false} : {})
};

const ghostApi = setupGhostApi({siteUrl: window.location.origin});
ghostApi.init = () => Promise.resolve({site, member});
ghostApi.member.checkoutGift = async (data) => {
    console.log('[harness] checkoutGift called with', data); // eslint-disable-line no-console
    return {};
};

let elem = document.getElementById('ghost-portal-root');
if (elem) {
    ReactDOM.unmountComponentAtNode(elem);
} else {
    elem = document.createElement('div');
    elem.id = 'ghost-portal-root';
    document.body.appendChild(elem);
}

ReactDOM.render(
    <App api={ghostApi} siteUrl={window.location.origin} customSiteUrl={window.location.origin} />,
    elem
);
