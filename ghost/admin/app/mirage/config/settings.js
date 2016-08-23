export default function mockSettings(server) {
    server.get('/settings/', function (db, request) {
        let filters = request.queryParams.type.split(',');
        let settings = [];

        filters.forEach((filter) => {
            settings.pushObjects(db.settings.where({type: filter}));
        });

        return {
            settings,
            meta: {
                filters: {
                    type: request.queryParams.type
                }
            }
        };
    });

    server.put('/settings/', function (db, request) {
        console.log('/settings/', request.requestBody);
        let newSettings = JSON.parse(request.requestBody).settings;

        db.settings.remove();
        db.settings.insert(newSettings);

        let [activeTheme] = db.settings.where({key: 'activeTheme'});
        let [availableThemes] = db.settings.where({key: 'availableThemes'});

        console.log('activeTheme', activeTheme);
        console.log('availableThemes', availableThemes);

        availableThemes.value.forEach((theme) => {
            if (theme.name === activeTheme.value) {
                theme.active = true;
            } else {
                theme.active = false;
            }
        });

        db.settings.update(availableThemes.id, availableThemes);

        return {
            meta: {},
            settings: db.settings
        };
    });
}
