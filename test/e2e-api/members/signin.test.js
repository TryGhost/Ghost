const membersService = require('../../../core/server/services/members');
const {agentProvider, mockManager, fixtureManager} = require('../../utils/e2e-framework');

let membersAgent;
let adminAgent;

describe('Members Signin', function () {
    before(async function () {
        // Weird - most of the mocks happen after getting the agent
        // but to mock stripe we want to fake the stripe keys in the settings.
        // And it's initialised at boot - so mocking it before
        // Probably wanna replace this with a settinfs fixture mock or smth??
        mockManager.setupStripe();

        const agents = await agentProvider.getAgentsForMembers();
        membersAgent = agents.membersAgent;
        adminAgent = agents.adminAgent;

        await fixtureManager.init('members');
        await adminAgent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockLabsEnabled('multipleProducts');
        mockManager.mockLabsEnabled('tierWelcomePages');
        mockManager.mockStripe();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Will not set a cookie if the token is invalid', async function () {
        await membersAgent.get('/?token=blah')
            .expectStatus(302)
            .expectHeader('Location', /\?\w*success=false/);
    });

    it('Will set a cookie if the token is valid', async function () {
        const magicLink = await membersService.api.getMagicLink('member1@test.com');
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');

        const res = await membersAgent.get(`/?token=${token}`)
            .expectStatus(302)
            .expectHeader('Location', /\?\w*success=true/)
            .expectHeader('Set-Cookie', /members-ssr.*/);
    });

    it('Will redirect to the free welcome page for signup', async function () {
        const magicLink = await membersService.api.getMagicLink('member1@test.com');
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');

        const {body: {products}} = await adminAgent.get('/products/');

        const freeProduct = products.find(product => product.type === 'free');

        await adminAgent.put(`/products/${freeProduct.id}/`).body({
            products: [{...freeProduct, welcome_page_url: '/welcome-free'}]
        });

        await membersAgent.get(`/?token=${token}&action=signup`)
            .expectStatus(302)
            .expectHeader('Location', /\/welcome-free\/$/)
            .expectHeader('Set-Cookie', /members-ssr.*/);
    });

    it('Will redirect to the paid welcome page for signup-paid', async function () {
        const magicLink = await membersService.api.getMagicLink('paid@test.com');
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');

        const {body: {products}} = await adminAgent.get('/products/');

        const paidProduct = products.find(product => product.type === 'paid');

        const res = await adminAgent.put(`/products/${paidProduct.id}/`).body({
            products: [{...paidProduct, welcome_page_url: '/welcome-paid'}]
        });

        await membersAgent.get(`/?token=${token}&action=signup-paid`)
            .expectStatus(302)
            .expectHeader('Location', /\/welcome-paid\/$/)
            .expectHeader('Set-Cookie', /members-ssr.*/);
    });

    it('Will redirect to the free welcome page for subscribe', async function () {
        const magicLink = await membersService.api.getMagicLink('member1@test.com');
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');

        const {body: {products}} = await adminAgent.get('/products/');

        const freeProduct = products.find(product => product.type === 'free');

        await adminAgent.put(`/products/${freeProduct.id}/`).body({
            products: [{...freeProduct, welcome_page_url: '/welcome-free'}]
        });

        await membersAgent.get(`/?token=${token}&action=subscribe`)
            .expectStatus(302)
            .expectHeader('Location', /\/welcome-free\/$/)
            .expectHeader('Set-Cookie', /members-ssr.*/);
    });
});
