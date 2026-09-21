export default function mockSettings(server) {
    server.get('/settings/', function ({db}, {queryParams}) {
        const {group} = queryParams;
        const filters = group.split(',');
        const settings = [];

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
        const newSettings = JSON.parse(requestBody).settings;

        newSettings.forEach((newSetting) => {
            const {key} = newSetting;

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
