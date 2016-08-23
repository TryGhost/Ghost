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
        let newSettings = JSON.parse(request.requestBody).settings;

        newSettings.forEach((newSetting) => {
            db.settings.update({key: newSetting.key}, newSetting);
        });

        let [activeTheme] = db.settings.where({key: 'activeTheme'});
        let [availableThemes] = db.settings.where({key: 'availableThemes'});

        availableThemes.value.forEach((theme) => {
            if (theme.name === activeTheme.value) {
                theme.active = true;
            } else {
                theme.active = false;
            }
        });

        db.settings.remove({key: 'availableThemes'});
        db.settings.insert(availableThemes);

        return {
            meta: {},
            settings: db.settings
        };
    });
}
