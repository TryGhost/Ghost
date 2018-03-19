export default function mockSettings(server) {
    server.get('/settings/', function ({db}, {queryParams}) {
        let {type} = queryParams;
        let filters = type.split(',');
        let settings = [];

        if (!db.settings.length) {
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
