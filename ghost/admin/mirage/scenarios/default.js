export default function (server) {
    // Seed your development database using your factories. This
    // data will not be loaded in your tests.

    // server.createList('contact', 10);

    server.createList('subscriber', 125);
    server.createList('tag', 100);

    server.create('integration', {name: 'Demo'});

    server.createList('member', 125);
}
