export default function mockSettings(server) {
    server.get('/settings/', function ({db}, {queryParams}) {
        let {group} = queryParams;
        let filters = group.split(',');
        let settings = [];

        if (!db.settings.length) {
            server.loadFixtures('settings');
        }

        filters.forEach((groupFilter) => {
            settings.pushObjects(db.settings.where({group: groupFilter}));
        });

        return {
            settings,
            meta: {filters: {group}}
        };
    });

    server.put('/settings/', function ({db}, {requestBody}) {
        let newSettings = JSON.parse(requestBody).settings;

        newSettings.forEach((newSetting) => {
            let {key} = newSetting;

            if (db.settings.where({key}).length > 0) {
                db.settings.update({key}, newSetting);
            } else {
                newSetting.group = newSetting.group || 'site';
                db.settings.insert(newSetting);
            }
        });

        return {
            meta: {},
            settings: db.settings
        };
    });
}
