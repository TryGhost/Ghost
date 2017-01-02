import {Response} from 'ember-cli-mirage';

let themeCount = 1;

export default function mockThemes(server) {
    server.post('/themes/upload/', function ({db}) {
        let [availableThemes] = db.settings.where({key: 'availableThemes'});
        // pretender/mirage doesn't currently process FormData so we can't use
        // any info passed in through the request
        let theme = {
            name: `test-${themeCount}`,
            package: {
                name: `Test ${themeCount}`,
                version: '0.1'
            },
            active: false
        };

        themeCount++;

        availableThemes.value.pushObject(theme);
        db.settings.update({key: 'availableThemes'}, availableThemes);

        return {
            themes: [theme]
        };
    });

    server.del('/themes/:theme/', function ({db}, {params}) {
        let [availableThemes] = db.settings.where({key: 'availableThemes'});

        availableThemes.value = availableThemes.value.filter((theme) => {
            return theme.name !== params.theme;
        });

        db.settings.update({key: 'availableThemes'}, availableThemes);

        return new Response(204, {}, null);
    });
}
