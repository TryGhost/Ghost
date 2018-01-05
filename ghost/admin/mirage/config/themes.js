import {Response} from 'ember-cli-mirage';

let themeCount = 1;

export default function mockThemes(server) {
    server.get('/themes');

    server.post('/themes/upload/', function ({themes}) {
        // pretender/mirage doesn't currently process FormData so we can't use
        // any info passed in through the request
        let theme = {
            name: `test-${themeCount}`,
            package: {
                name: `Test ${themeCount}`,
                version: '0.1'
            }
        };

        themeCount += 1;

        theme = themes.create(theme);

        return {themes: [theme]};
    });

    server.del('/themes/:theme/', function ({themes}, {params}) {
        themes.findBy({name: params.theme}).destroy();

        return new Response(204, {}, null);
    });

    server.put('/themes/:theme/activate/', function ({themes}, {params}) {
        themes.all().update('active', false);
        let theme = themes.findBy({name: params.theme}).update({active: true});

        return {themes: [theme]};
    });
}
