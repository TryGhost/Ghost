// Vendored, trimmed-down version of mock-knex.
//
// Originally authored by Jason Brumwell, Copyright (c) 2014 Colony American
// Homes, released under the MIT License
// (https://github.com/colonyamerican/mock-knex). Ghost maintained a fork at
// https://github.com/TryGhost/mock-knex, from which this file is derived.
//
// The upstream package is unmaintained. We only use it to intercept knex
// queries in a handful of unit tests so we can assert on generated SQL/bindings
// without touching a real database.
//
// This file flattens the parts of mock-knex that are relevant for knex 2.x
// (upstream's `knex/2.0` platform adapter, which re-exports `knex/0.12` ->
// `0.11` -> `0.8`) into a single module. The version-detection machinery and
// the 20+ other platform adapters have been dropped since Ghost is pinned to a
// single knex version. `bluebird` has been replaced with native Promises.
//
// Public API (the only surface our tests rely on):
//   const mockDb = require('.../mock-knex');
//   mockDb.mock(knex);
//   mockDb.unmock(knex);
//   const tracker = mockDb.getTracker();
//   tracker.install();
//   tracker.uninstall();
//   tracker.on('query', (query, step) => { query.response([...]); });

const {EventEmitter} = require('events');
const _ = require('lodash');

// --- util/transformer.js ---------------------------------------------------

const MockSymbol = Symbol('unmock');

class Mocker {
    context(obj, path) {
        const paths = path.split('.');

        paths.pop();

        return _.get(obj, paths, obj);
    }

    paths(obj, parent) {
        return _.chain(obj)
            .map((value, key) => {
                let out;

                if (_.isPlainObject(value)) {
                    out = this.paths(value, parent ? `${parent}.${key}` : key);
                } else {
                    out = parent ? `${parent}.${key}` : key;
                }

                return out;
            })
            .flatten()
            .value();
    }

    _replace(obj, spec, replaced, path) {
        let replacement = _.get(spec, path);

        path = path.replace('._constructor.', '.constructor.').replace('._prototype.', '.prototype.');

        const context = this.context(obj, path);
        const name = _.last(path.split('.'));
        const replacedPath = path.replace('.constructor.', '._constructor.').replace('.prototype.', '._prototype.');

        if (!_.get(replaced, path)) {
            _.set(replaced, replacedPath, _.get(obj, path));
        }

        context[name] = replacement;
    }

    replace(obj, specs) {
        const replaced = {};

        specs = _.isArray(specs) ? specs : [specs];

        _.forEach(specs, (spec) => {
            const paths = _.partition(this.paths(spec), (path) => {
                return path.indexOf('_constructor') === -1;
            });

            _.forEach(paths[0], this._replace.bind(this, obj, spec, replaced));
            _.forEach(paths[1], this._replace.bind(this, obj, spec, replaced));
        });

        this.restorer.replace = replaced;

        return obj;
    }

    undefine(obj, specs) {
        specs = _.isArray(specs) ? specs : [specs];

        _.forEach(specs, (spec) => {
            const paths = this.paths(spec);

            _.forEach(paths, (path) => {
                const context = this.context(obj, path, true);
                const property = path.split('.').pop();
                const value = _.get(spec, path);

                if (_.isUndefined(value)) {
                    delete context[property];
                } else {
                    context[property] = value;
                }
            });
        });

        return obj;
    }

    define(obj, specs) {
        const defined = {};

        specs = _.isArray(specs) ? specs : [specs];

        _.forEach(specs, (spec) => {
            _.forEach(spec, (descriptors, path) => {
                const context = this.context(obj, path, true);
                const property = path.split('.').pop();

                if (!_.get(defined, path)) {
                    _.set(defined, path, _.get(obj, path));
                }

                descriptors.configurable = true;

                Object.defineProperty(context, property, descriptors);
            });
        });

        this.restorer.define = defined;

        return obj;
    }

    transform(obj, spec) {
        this.restorer = {};

        if (obj[MockSymbol]) {
            throw new Error('Unable to transform, this database is already mocked');
        }

        if (spec.replace) {
            this.replace(obj, spec.replace);
        }

        if (spec.define) {
            this.define(obj, spec.define);
        }

        obj[MockSymbol] = this.restorer;

        return obj;
    }

    restore(obj) {
        const spec = obj[MockSymbol];

        this.restorer = {};

        if (!spec) {
            throw new Error('Unable to locate mocked data to revert');
        }

        if (spec.replace) {
            this.replace(obj, spec.replace);
        }

        if (spec.define) {
            this.undefine(obj, spec.define);
        }

        delete obj[MockSymbol];
    }
}

const transformer = new Mocker();

// --- queries.js ------------------------------------------------------------

class Queries {
    constructor(tracker) {
        this.tracker = tracker;
        this.queries = [];
    }

    reset() {
        this.queries = [];

        return this;
    }

    track(query, resolve, reject) {
        if (this.tracker.tracking) {
            query.mock = {
                ..._.get(query, 'mock', {}),
                ..._.pick(query, [
                    'method',
                    'sql',
                    'bindings',
                    'returning',
                    'transacting'
                ]),

                response(response, options = {}) {
                    if (!options.stream) {
                        query.result = response;
                        resolve(query);
                    } else {
                        resolve({
                            response
                        });
                    }
                },

                resolve(result) {
                    return this.response(result);
                },

                reject(error) {
                    if (_.isString(error)) {
                        error = new Error(error);
                    }

                    reject(error);
                }
            };

            delete query.result;

            query.mock.step = this.queries.push(query);

            this.tracker.emit('query', query.mock, query.mock.step);
        } else {
            resolve();
        }
    }

    first() {
        return this.queries[0];
    }

    count() {
        return this.queries.length;
    }

    last() {
        return this.queries[this.count() - 1];
    }

    step(step) {
        return this.queries[step - 1];
    }
}

// --- tracker.js ------------------------------------------------------------

class Tracker extends EventEmitter {
    constructor() {
        super(...arguments);
        this.tracking = false;
        this.queries = new Queries(this);
    }

    install() {
        this.tracking = true;
        this.queries.reset();
        this.removeAllListeners('query');
    }

    uninstall() {
        this.tracking = false;
        this.queries.reset();
        this.removeAllListeners('query');
    }

    wrap(cb) {
        this.install();

        try {
            cb();
        } finally {
            this.uninstall();
        }
    }
}

const tracker = new Tracker();

// --- platforms/knex/0.8 ----------------------------------------------------

const connection = {
    id: 'mockedConnection'
};

const processResponse = function (obj) {
    obj = obj || {};

    if (obj.output) {
        obj.result = obj.output.call(this, obj.result);
    } else if (obj.method === 'first') {
        obj.result = Array.isArray(obj.result) ? obj.result[0] : obj.result;
    } else if (obj.method === 'pluck') {
        obj.result = _.map(obj.result, obj.pluck);
    }

    return obj.result;
};

const _query = function (_con, obj) {
    obj.context = this;

    obj.transacting = !!this.transacting;

    return new Promise((resolve, reject) => {
        tracker.queries.track(obj, resolve, reject);
    });
};

function defineConnection(conn) {
    return {
        'client.Runner.prototype.connection': {
            get() {
                return conn;
            },
            set: _.noop
        }
    };
}

const spec08 = {
    replace: [
        {
            client: {
                _constructor: {
                    prototype: {
                        _stream(conn, sql, stream) {
                            return new Promise((resolver, rejecter) => {
                                stream.on('error', rejecter);
                                stream.on('end', resolver);

                                this._query(conn, sql).then((obj) => {
                                    const rows = (obj && obj.response) || [];
                                    rows.forEach(row => stream.write(row));
                                }).catch((err) => {
                                    stream.emit('error', err);
                                }).then(() => {
                                    stream.end();
                                });
                            });
                        },
                        _query,
                        processResponse
                    }
                },
                driverName: 'mocked',
                acquireConnection: () => Promise.resolve(connection),
                acquireRawConnection: () => Promise.resolve(connection),
                destroyRawConnection: (_con, cb) => cb(),
                releaseConnection: _.noop,
                processResponse,

                Runner: {
                    prototype: {
                        ensureConnection() {
                            return Promise.resolve(this.connection || {});
                        }
                    }
                }
            }
        }
    ],

    define: defineConnection(connection)
};

// --- platforms/knex/0.11 ---------------------------------------------------

const connection011 = {
    id: 'mockedConnection'
};

const spec011 = _.defaultsDeep({
    replace: [
        {
            client: {
                acquireConnection() {
                    return {
                        completed: connection011,
                        abort: _.noop
                    };
                },

                acquireRawConnection: () => Promise.resolve({
                    completed: connection011,
                    abort: _.noop
                }),

                releaseConnection: () => Promise.resolve()
            }
        }
    ],

    define: defineConnection(connection011)
}, spec08);

// --- platforms/knex/0.12 (used by knex 2.x) --------------------------------

const connection012 = {
    __knexUid: 'mockedConnection',
    timeout: () => Promise.resolve(connection012)
};

const spec = _.defaultsDeep({
    replace: [
        {
            client: {
                acquireConnection() {
                    return Promise.resolve(connection012);
                },
                destroyRawConnection(_conn) {}
            }
        }
    ]
}, spec011);

const adapter = {
    mock(db) {
        return transformer.transform(db, spec);
    },

    unmock(db) {
        return transformer.restore(db);
    }
};

// --- index.js --------------------------------------------------------------

class MockKnex {
    getTracker() {
        return tracker;
    }

    mock(db) {
        return adapter.mock(db);
    }

    unmock(db) {
        return adapter.unmock(db);
    }

    isMocked(db) {
        return !!db[MockSymbol];
    }

    getAdapter() {
        return adapter;
    }
}

module.exports = new MockKnex();
