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

            if (db.settings.where({key}).length > 0) {
                db.settings.update({key}, newSetting);
            } else {
                newSetting.type = newSetting.type || 'blog';
                db.settings.insert(newSetting);
            }
        });

        return {
            meta: {},
            settings: db.settings
        };
    });
}
