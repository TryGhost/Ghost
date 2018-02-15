'use strict';

const mockKnex = require('mock-knex'),
    _ = require('lodash'),
    DataGenerator = require('../fixtures/data-generator'),
    knex = require('../../../server/data/db').knex;

/**
 * Knex mock. The database is our Datagenerator.
 * You can either self register queries or you simply rely on the data generator data.
 *
 * Please extend if you use-case does not work.
 */
class KnexMock {
    initialiseDb() {
        this.db = {};

        _.each(_.pick(DataGenerator.Content, ['posts', 'users', 'tags', 'permissions', 'roles']), (objects, tableName) => {
            this.db[tableName] = [];

            _.each(objects, (object) => {
                const lookup = {
                    users: DataGenerator.forKnex.createUser,
                    posts: DataGenerator.forKnex.createPost,
                    tags: DataGenerator.forKnex.createTag,
                    permissions: DataGenerator.forKnex.createPermission,
                    roles: DataGenerator.forKnex.createRole,
                };

                this.db[tableName].push(lookup[tableName](object));
            });
        });
    }

    mock(options) {
        options = options || {autoMock: true};
        mockKnex.mock(knex);

        this.initialiseDb();

        this.tracker = mockKnex.getTracker();
        this.tracker.install();

        if (options.autoMock) {
            this.tracker.on('query', (query) => {
                query.sql = query.sql.replace(/`/g, '"');

                if (query.method === 'select') {
                    if (query.bindings.length && query.sql.match(/where/)) {
                        const tableName = query.sql.match(/from\s\"(\w+)\"/)[1],
                            where = query.sql.match(/\"(\w+)\"\s\=\s\?/)[1],
                            value = query.bindings[0],
                            dbEntry = _.find(this.db[tableName], ((existing) => {
                                if (existing[where] === value) {
                                    return true;
                                }
                            }));

                        if (dbEntry) {
                            query.response([dbEntry]);
                        } else {
                            query.response([]);
                        }
                    } else {
                        const tableName = query.sql.match(/from\s\"(\w+)\"/)[1];
                        query.response(this.db[tableName]);
                    }
                } else if (query.method === 'insert') {
                    const tableName = query.sql.match(/into\s\"(\w+)\"/)[1];
                    let keys = query.sql.match(/\(([^)]+)\)/)[1],
                        entry = {};

                    keys = keys.replace(/"/g, '');
                    keys = keys.replace(/\s/g, '');
                    keys = keys.split(',');

                    _.each(keys, (key, index) => {
                        entry[key] = query.bindings[index];
                    });

                    if (!this.db[tableName]) {
                        this.db[tableName] = [];
                    }

                    this.db[tableName].push(entry);
                    query.response(entry);
                } else if (query.method === 'update') {
                    const tableName = query.sql.match(/update\s\"(\w+)\"/)[1],
                        where = query.sql.match(/where\s\"(\w+)\"\s\=\s\?/)[1],
                        value = query.bindings.slice(-1)[0],
                        dbEntry = _.find(this.db[tableName], ((existing) => {
                            if (existing[where] === value) {
                                return true;
                            }
                        }));

                    if (!dbEntry) {
                        query.reject(new Error('not found'));
                    } else {
                        let keys = query.sql.match(/set(.*)where/)[1],
                            entry = {};

                        keys = keys.match(/\"\w+\"/g).join(',');
                        keys = keys.replace(/"/g, '');
                        keys = keys.replace(/\s/g, '');
                        keys = keys.split(',');

                        _.each(keys, (key, index) => {
                            entry[key] = query.bindings[index];
                            dbEntry[key] = entry[key];
                        });

                        query.response(entry);
                    }
                } else {
                    query.reject(new Error('not implemented.'));
                }
            });
        }

        return this.tracker;
    }

    unmock() {
        this.tracker.uninstall();
        mockKnex.unmock(knex);
    }
}

module.exports = KnexMock;
