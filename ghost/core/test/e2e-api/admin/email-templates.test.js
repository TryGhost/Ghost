const {agentProvider, fixtureManager, matchers, dbUtils} = require('../../utils/e2e-framework');
const {anyContentVersion, anyObjectId, anyISODateTime, anyErrorId, anyEtag} = matchers;

const matchEmailTemplate = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

describe('Email Templates API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsOwner();
    });

    afterEach(async function () {
        // Reset any changes made during edit tests so browse snapshot stays stable
        await dbUtils.knex('email_templates').update({
            header_image: null,
            show_publication_title: true,
            show_badge: true,
            footer_content: null,
            background_color: '#ffffff',
            title_font_category: 'sans_serif',
            title_font_weight: 'bold',
            body_font_category: 'sans_serif',
            header_background_color: '#ffffff',
            title_alignment: 'center',
            post_title_color: null,
            section_title_color: null,
            button_color: 'accent',
            button_style: 'fill',
            button_corners: 'rounded',
            link_color: 'accent',
            link_style: 'underline',
            image_corners: 'square',
            divider_color: null
        });
    });

    describe('Browse', function () {
        it('Can browse email templates', async function () {
            await agent
                .get('email_templates')
                .expectStatus(200)
                .matchBodySnapshot({
                    email_templates: [matchEmailTemplate]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });

    describe('Read', function () {
        it('Can read an email template by id', async function () {
            const {body: {email_templates: [template]}} = await agent
                .get('email_templates')
                .expectStatus(200);

            await agent
                .get(`email_templates/${template.id}`)
                .expectStatus(200)
                .matchBodySnapshot({
                    email_templates: [matchEmailTemplate]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Cannot read a non-existent template', async function () {
            await agent
                .get('email_templates/aaaaaaaaaaaaaaaaaaaaaaaa')
                .expectStatus(404)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });

    describe('Edit', function () {
        it('Can edit an email template', async function () {
            const {body: {email_templates: [template]}} = await agent
                .get('email_templates')
                .expectStatus(200);

            await agent
                .put(`email_templates/${template.id}`)
                .body({email_templates: [{
                    background_color: '#f0f0f0',
                    title_font_category: 'serif',
                    button_style: 'outline',
                    show_badge: false,
                    footer_content: 'Custom footer text'
                }]})
                .expectStatus(200)
                .matchBodySnapshot({
                    email_templates: [matchEmailTemplate]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Cannot edit a non-existent template', async function () {
            await agent
                .put('email_templates/aaaaaaaaaaaaaaaaaaaaaaaa')
                .body({email_templates: [{
                    background_color: '#000000'
                }]})
                .expectStatus(404)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });
});
