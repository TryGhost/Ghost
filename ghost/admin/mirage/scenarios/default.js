export default function (server) {
    // Seed your development database using your factories. This
    // data will not be loaded in your tests.

    // server.createList('contact', 10);

    server.createList('tag', 100);

    server.create('integration', {name: 'Demo'});

    server.createList('member', 125);

    // sites always have a default newsletter
    server.create('newsletter', {
        name: 'Site title',
        slug: 'site-title',
        description: 'Default newsletter created during setup',

        senderName: null,
        senderEmail: null,
        senderReplyTo: 'newsletter',

        status: 'active',
        recipientFilter: null,
        subscribeOnSignup: true,
        sortOrder: 0,

        headerImage: null,
        showHeaderIcon: true,
        showHeaderTitle: true,
        titleFontCategory: 'sans_serif',
        titleAlignment: 'center',
        showFeatureImage: true,
        bodyFontCategory: 'sans_serif',
        footerContent: null,
        showBadge: true
    });
}
