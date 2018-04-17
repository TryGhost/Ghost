'use strict';
/* eslint-disable */

const mockKnex = require('mock-knex'),
    _ = require('lodash'),
    debug = require('ghost-ignition').debug('tests:knex-mock'),
    DataGenerator = require('../fixtures/data-generator'),
    knex = require('../../../server/data/db').knex;

/**
 * Knex mock. The database is our Datagenerator.
 * You can either self register queries or you simply rely on the data generator data.
 *
 * Please extend if you use-case does not work.
 *
 * @TODO: sqlite3 :memory: mode wasn't working for me
 */
class KnexMock {
    initialiseDb() {
        this.db = {};

        _.each(_.pick(_.cloneDeep(DataGenerator.forKnex), [
            'posts',
            'users',
            'tags',
            'permissions',
            'roles',
            'posts_authors',
            'posts_tags'
        ]), (objects, tableName) => {
            this.db[tableName] = [];

            _.each(objects, (object) => {
                this.db[tableName].push(object);
            });
        });
    }

    resetDb() {
        return this.initialiseDb();
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
                debug('#### Query start.');
                debug(query.sql);

                // CASE: transactions
                if (query.sql.match(/BEGIN|COMMIT|ROLLBACK/)) {
                    query.response();
                    debug('#### Query end.\n');
                    return;
                }

                if (query.method === 'select') {
                    if (query.bindings.length && query.sql.match(/where/)) {
                        // CASE: joins should return e.g. `posts_tags=[tag,tag]`
                        if (query.sql.match(/inner\sjoin/)) {
                            let targetTable = query.sql.match(/inner\sjoin\s(\"\w+\")/)[1],
                                targetAttribute = query.sql.match(/on\s\"\w+\"\.(\"\w+\")/)[1],
                                joinAttribute = query.sql.match(/on\s\"\w+\"\.\"\w+\"\s\=\s\"\w+\"\.(\"\w+\")/)[1],
                                joinTable = query.sql.match(/on\s\"\w+\"\.\"\w+\"\s\=\s(\"\w+\")/)[1],
                                targetIdentifier = query.sql.match(/(\"\w+\")\sin\s\(\?\)/),
                                values = query.bindings,
                                targetEntries,
                                toReturn = [];

                            if (!targetIdentifier) {
                                targetIdentifier = query.sql.match(/where\s\"\w+\"\.\"(\w+)\"\s\=/);
                            }

                            if (!targetIdentifier) {
                                targetIdentifier = query.sql.match(/where\s\"\w+\"\.\"(\w+)\"\s\in\s/);
                            }

                            if (targetIdentifier) {
                                targetIdentifier = targetIdentifier[1];
                            }

                            targetTable = targetTable.replace(/"/g, '');
                            targetIdentifier = targetIdentifier.replace(/"/g, '');
                            targetAttribute = targetAttribute.replace(/"/g, '');
                            joinTable = joinTable.replace(/"/g, '');
                            joinAttribute = joinAttribute.replace(/"/g, '');

                            debug(targetTable, targetIdentifier, targetAttribute, joinTable, joinAttribute);

                            targetEntries = _.filter(this.db[targetTable], ((existing) => {
                                if (values.indexOf(existing[targetIdentifier]) !== -1) {
                                    return true;
                                }
                            }));

                            if (targetEntries && targetEntries.length) {
                                _.each(targetEntries, ((target) => {
                                    const found = _.cloneDeep(_.find(this.db[joinTable], ((joinEntry) => {
                                        if (joinEntry[joinAttribute] === target[targetAttribute]) {
                                            return true;
                                        }
                                    })));

                                    _.each(target, function (value, key) {
                                        let match = query.sql.match(new RegExp('\\"' + targetTable + '\\"\\.\\"' + key + '"\\sas\\s(\\"\\w+\\")'));

                                        // CASE: e.g. id
                                        if (match) {
                                            match = match[1];
                                            match = match.replace(/"/g, '');
                                            found[match] = value;
                                        }
                                    });

                                    if (found) {
                                        toReturn.push(found);
                                    }
                                }));

                                // @TODO: This is not really generic ;)
                                toReturn = _.orderBy(toReturn, ['_pivot_sort_order'], ['asc']);
                                query.response(toReturn);
                                debug('#### Query end.\n');
                            } else {
                                query.response([]);
                                debug('#### Query end.\n');
                            }
                        } else {
                            let tableName = query.sql.match(/from\s\"(\w+)\"/)[1],
                                where = query.sql.match(/\"(\w+)\"\s\=\s\?/),
                                values = query.bindings,
                                dbEntry,
                                wheres = [];

                            // where "users"."id" in ('1')
                            if (!where) {
                                where = query.sql.match(/\"\w+\"\.\"(\w+)\"\sin\s\(\?\)/)[1];
                            } else {
                                // 3 wheres
                                let wheresMatch = query.sql.match(/\"(\w+)\"\s\=\s\?\sand\s\"\w+\"\.\"(\w+)\"\s\=\s\?\sand\s\"\w+\"\.\"(\w+)\"\s\=\s\?/);

                                if (wheresMatch) {
                                    wheres.push(wheresMatch[1]);
                                    wheres.push(wheresMatch[2]);
                                    wheres.push(wheresMatch[3]);
                                } else {
                                    // 2 wheres
                                    let wheresMatch = query.sql.match(/\"(\w+)\"\s\=\s\?\sand\s\"\w+\"\.\"(\w+)\"\s\=\s\?/);

                                    if (wheresMatch) {
                                        wheres.push(wheresMatch[1]);
                                        wheres.push(wheresMatch[2]);
                                    } else {
                                        wheres.push(where[1]);
                                    }
                                }
                            }

                            values = query.bindings.slice(0, wheres.length);

                            debug(tableName, wheres, values);

                            dbEntry = _.filter(this.db[tableName], ((existing) => {
                                if (_.isEqual(_.values(_.pick(existing, wheres)), values)) {
                                    return true;
                                }
                            }));

                            if (dbEntry) {
                                // select fields
                                dbEntry = _.map(dbEntry, (obj) => {
                                    let keys = query.sql.match(/select\s(\".*\"\,?)+\sfrom/);

                                    if (keys) {
                                        keys = keys[1];
                                        keys = keys.replace(/"/g, '');
                                        keys = keys.replace(/\s/g, '');
                                        keys = keys.split(',');
                                        return _.pick(obj, keys);
                                    }

                                    return obj;
                                });

                                query.response(dbEntry);
                                debug('#### Query end.\n');
                            } else {
                                query.response([]);
                                debug('#### Query end. Not found\n');
                            }
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
                    debug('#### Query end.\n');
                } else if (query.method === 'update') {
                    let tableName = query.sql.match(/update\s\"(\w+)\"/)[1],
                        where = query.sql.match(/where\s\"(\w+)\"\s\=\s\?/)[1],
                        andWhere = query.sql.match(/where\s\"\w+\"\s\=\s\?\sand\s\"(\w+)\"/),
                        valueWhere,
                        valueAndWhere,
                        dbEntry;

                    if (andWhere) {
                        andWhere = andWhere[1];
                        valueWhere = query.bindings.slice(1, -1)[0];
                        valueAndWhere = query.bindings.slice(-1)[0];
                    } else {
                        valueWhere = query.bindings.slice(-1)[0];
                    }

                    debug(tableName, where, valueWhere, andWhere, valueAndWhere, query.bindings);

                    dbEntry = _.find(this.db[tableName], ((existing) => {
                        if (existing[where] === valueWhere) {
                            if (andWhere) {
                                if (existing[andWhere] === valueAndWhere) {
                                    return true;
                                }
                            } else {
                                return true;
                            }
                        }
                    }));

                    if (!dbEntry) {
                        query.response([]);
                        debug('#### Query end. Can\'t update - not found.\n');
                    } else {
                        let keys = query.sql.match(/set(.*)where/)[1],
                            entry = {};

                        keys = keys.match(/\"\w+\"/g).join(',');
                        keys = keys.replace(/"/g, '');
                        keys = keys.replace(/\s/g, '');
                        keys = keys.split(',');

                        debug('set', keys);

                        _.each(keys, (key, index) => {
                            entry[key] = query.bindings[index];
                            dbEntry[key] = entry[key];
                        });

                        query.response(entry);
                        debug('#### Query end.\n');
                    }
                } else {
                    let tableName = query.sql.match(/from\s\"(\w+)\"/)[1],
                        where = query.sql.match(/where\s\"(\w+)\"\s\=\s\?/)[1],
                        andWhere = query.sql.match(/where\s\"\w+\"\s\=\s\?\sand\s\"(\w+)\"/),
                        valueWhere,
                        valueAndWhere;

                    valueWhere = query.bindings[0];

                    if (andWhere) {
                        andWhere = andWhere[1];
                        valueAndWhere = query.bindings[1];
                    }

                    debug(tableName, where, valueWhere, andWhere, valueAndWhere, query.bindings);

                    this.db[tableName] = this.db[tableName].filter((existing) => {
                        if (existing[where] === valueWhere) {
                            if (andWhere) {
                                if (existing[andWhere] === valueAndWhere) {
                                    return false;
                                } else {
                                    return true;
                                }
                            } else {
                                return false;
                            }
                        } else {
                            return true;
                        }
                    });

                    query.response([]);
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
