export default function mockSettings(server) {
    // These endpoints use the raw database & fixtures without going
    // through the ORM at all (meaning no setting model). This is due
    // to https://github.com/samselikoff/ember-cli-mirage/issues/943
    // as far as can be determined.
    // potential TODO: update once the above issue is fixed? We don't really
    // gain anything from using the ORM for settings so it may not be a good idea
    server.get('/settings/', function ({db}, {queryParams}) {
        let {type} = queryParams;
        let filters = type.split(',');
        let settings = [];

        if (!db.settings) {
            server.loadFixtures('settings');
        }

        filters.forEach((type) => {
            settings.pushObjects(db.settings.where({type}));
        });

        return {
            settings,
            meta: {filters: {type}}
        };
    });

    server.put('/settings/', function ({db}, {requestBody}) {
        let newSettings = JSON.parse(requestBody).settings;

        newSettings.forEach((newSetting) => {
            let {key} = newSetting;
            db.settings.update({key}, newSetting);
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

        db.settings.update({key: 'availableThemes'}, availableThemes);

        return {
            meta: {},
            settings: db.settings
        };
    });
}
