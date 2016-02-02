export default function (server) {
    // Seed your development database using your factories. This
    // data will not be loaded in your tests.

    // let trusted_domain = server.create('trusted_domain');
    // server.createList('client', 5, {trusted_domain_id: trusted_domain.id});

        server.createList('client', 5);
}
