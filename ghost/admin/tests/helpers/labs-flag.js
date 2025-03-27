export function enableLabsFlag(server, flag) {
    if (!server.schema.configs.all().length) {
        server.loadFixtures('configs');
    }

    if (!server.schema.settings.all().length) {
        server.loadFixtures('settings');
    }

    const config = server.schema.configs.first();
    config.update({enableDeveloperExperiments: true});

    const existingSetting = server.db.settings.findBy({key: 'labs'}).value;
    const labsSetting = existingSetting ? JSON.parse(existingSetting) : {};
    labsSetting[flag] = true;

    server.db.settings.update({key: 'labs'}, {value: JSON.stringify(labsSetting)});
}

export function disableLabsFlag(server, flag) {
    if (!server.schema.configs.all().length) {
        server.loadFixtures('configs');
    }

    if (!server.schema.settings.all().length) {
        server.loadFixtures('settings');
    }

    const config = server.schema.configs.first();
    config.update({enableDeveloperExperiments: true});

    const labsSetting = {};
    labsSetting[flag] = false;

    server.db.settings.update({key: 'labs'}, {value: JSON.stringify(labsSetting)});
}
