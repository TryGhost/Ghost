export default function (server, flag) {
    if (!server.schema.configs.all().length) {
        server.loadFixtures('configs');
    }

    if (!server.schema.settings.all().length) {
        server.loadFixtures('settings');
    }

    const config = server.schema.configs.first();
    config.update({enableDeveloperExperiments: true});

    const labsSetting = {};
    labsSetting[flag] = true;

    server.db.settings.update({key: 'labs'}, {value: JSON.stringify(labsSetting)});
}
