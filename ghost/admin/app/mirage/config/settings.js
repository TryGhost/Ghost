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

        db.settings.remove();
        db.settings.insert(newSettings);

        return {
            meta: {},
            settings: db.settings
        };
    });
}
