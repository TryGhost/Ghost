const path = require('path');
const fs = require('fs-extra');
const config = require('../../../../../shared/config');
const logging = require('@tryghost/logging');
const models = require('../../../../models');
const message1 = 'Removing `globals.permalinks` from routes.yaml.';
const message2 = 'Removed `globals.permalinks` from routes.yaml.';
const message3 = 'Skip: Removing `globals.permalinks` from routes.yaml.';
const message4 = 'Rollback: Removing `globals.permalink` from routes.yaml. Nothing todo.';
const message5 = 'Skip Rollback: Removing `globals.permalinks` from routes.yaml. Nothing todo.';

module.exports.up = () => {
    let localOptions = {
        context: {internal: true}
    };

    const fileName = 'routes.yaml';
    const contentPath = config.getContentPath('settings');
    const filePath = path.join(contentPath, fileName);
    let settingsModel;

    logging.info(message1);

    return fs.readFile(filePath, 'utf8')
        .then((content) => {
            if (content.match(/globals\.permalinks/)) {
                return models.Settings.findOne({key: 'permalinks'}, localOptions)
                    .then((model) => {
                        // CASE: the permalinks setting get's inserted when you first start Ghost
                        if (!model) {
                            model = {
                                get: () => {
                                    return '/:slug/';
                                }
                            };
                        }

                        settingsModel = model;

                        // CASE: create a backup
                        return fs.copy(
                            path.join(filePath),
                            path.join(contentPath, 'routes-1.0-backup.yaml')
                        );
                    })
                    .then(() => {
                        const permalinkValue = settingsModel.get('value');
                        let modifiedContent = content.replace(/\/?'?{globals.permalinks}'?\/?/g, permalinkValue.replace(/:(\w+)/g, '{$1}'));

                        if (modifiedContent.indexOf('# special 1.0 compatibility setting. See the docs for details.') !== -1) {
                            modifiedContent = modifiedContent.replace('# special 1.0 compatibility setting. See the docs for details.', '');
                        }

                        return fs.writeFile(filePath, modifiedContent, 'utf8');
                    })
                    .then(() => {
                        logging.info(message2);
                    });
            } else {
                logging.warn(message3);
            }
        });
};

module.exports.down = () => {
    const fileName = 'routes-1.0-backup.yaml';
    const contentPath = config.getContentPath('settings');
    const filePath = path.join(contentPath, fileName);

    logging.info(message4);

    return fs.readFile(filePath, 'utf8')
        .then(() => {
            return fs.copy(
                path.join(filePath),
                path.join(contentPath, 'routes.yaml')
            );
        })
        .then(() => {
            return fs.remove(filePath);
        })
        .catch(() => {
            logging.warn(message5);
        });
};
