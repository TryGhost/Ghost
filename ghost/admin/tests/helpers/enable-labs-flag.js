export default function (server, flag) {
    server.loadFixtures('configs');
    const config = server.schema.configs.first();
    config.update({enableDeveloperExperiments: true});

    const labsSetting = {};
    labsSetting[flag] = true;

    server.loadFixtures('settings');
    server.db.settings.update({key: 'labs'}, {value: JSON.stringify(labsSetting)});
}
