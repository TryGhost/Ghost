const assert = require('node:assert/strict');

const _ = require('lodash');
const sinon = require('sinon');
const nql = require('@tryghost/nql-lang');

const Cache = require('../../../../core/shared/custom-theme-settings-cache/custom-theme-settings-cache');
const Service = require('../../../../core/shared/custom-theme-settings-cache/custom-theme-settings-service');

function makeModelInstance(data) {
    const instance = Object.assign({}, data, {
        set: () => {},
        save: async () => {},
        hasChanged: () => {
            return true;
        }
    });

    return sinon.spy(instance);
}

class ModelStub {
    constructor(knownSettings) {
        this.knownSettings = knownSettings.map(makeModelInstance);
        this.nextId = knownSettings.length + 1;
    }

    async findAll(options) {
        let foundSettings = this.knownSettings;

        if (options.filter) {
            // we only use 'theme:{themeName}' in filters
            const [key, value] = options.filter.split(':');
            const matcher = {};
            matcher[key] = value.replace(/^'|'$/g, '');

            foundSettings = this.knownSettings.filter(_.matches(matcher));
        }

        return {
            toJSON: () => foundSettings
        };
    }

    async findOne(data) {
        return this.knownSettings.find(_.matches(data));
    }

    async add(data) {
        const newSetting = makeModelInstance(Object.assign({}, data, {id: this.nextId}));
        this.knownSettings.push(newSetting);
        this.nextId = this.nextId + 1;
        return newSetting;
    }

    async edit(data, options) {
        const knownSetting = this.knownSettings.find(setting => setting.id === options.id);
        Object.assign(knownSetting, data);
        return knownSetting;
    }

    async destroy(options) {
        const destroyedSetting = this.knownSettings.find(setting => setting.id === options.id);
        this.knownSettings = this.knownSettings.filter(setting => setting !== destroyedSetting);
        return destroyedSetting;
    }
}

describe('Service', function () {
    let service, cache, model;

    beforeEach(function () {
        model = sinon.spy(new ModelStub([{
            id: 1,
            theme: 'test',
            key: 'one',
            type: 'select',
            value: '1'
        }, {
            id: 2,
            theme: 'test',
            key: 'two',
            type: 'select',
            value: '2'
        }]));

        cache = new Cache();

        service = new Service({model, cache});
    });

    describe('activateTheme()', function () {
        it('sets .activeThemeName correctly', function () {
            assert.equal(service.activeThemeName, null);

            // theme names do not always match the name in package.json
            service.activateTheme('Test-test', {name: 'test'});

            assert.equal(service.activeThemeName, 'Test-test');
        });

        it('handles known settings not seen in theme', async function () {
            await service.activateTheme('test', {
                name: 'test',
                customSettings: {
                    // 'one' custom setting no longer exists
                    // 'two' - no change
                    two: {
                        type: 'select',
                        options: ['2', '3'],
                        default: '2'
                    }
                }
            });

            sinon.assert.calledTwice(model.findAll);
            assert.deepEqual(model.findAll.getCall(0).firstArg, {filter: `theme:'test'`});
            assert.deepEqual(model.findAll.getCall(1).firstArg, {filter: `theme:'test'`});

            // destroys records that no longer exist in theme
            sinon.assert.calledOnce(model.destroy);
            assert.deepEqual(model.destroy.getCall(0).firstArg, {id: 1});

            // internal cache is correct
            assert.deepEqual(service.listSettings(), [{
                id: 2,
                key: 'two',
                type: 'select',
                options: ['2', '3'],
                default: '2',
                value: '2'
            }]);

            // external cache is correct
            assert.deepEqual(cache.getAll(), {
                two: '2'
            });
        });

        it('handles known settings that change type', async function () {
            await service.activateTheme('test', {
                name: 'test',
                customSettings: {
                    // no change
                    one: {
                        type: 'select',
                        options: ['1', '2'],
                        default: '2'
                    },
                    // switch from select to boolean
                    two: {
                        type: 'boolean',
                        default: true
                    }
                }
            });

            // destroys and recreates record
            sinon.assert.calledOnce(model.destroy);
            assert.deepEqual(model.destroy.getCall(0).firstArg, {id: 2});

            sinon.assert.calledOnce(model.add);
            assert.deepEqual(model.add.getCall(0).firstArg, {
                theme: 'test',
                key: 'two',
                type: 'boolean',
                value: true
            });

            // internal cache is correct
            assert.deepEqual(service.listSettings(), [{
                id: 1,
                key: 'one',
                type: 'select',
                options: ['1', '2'],
                default: '2',
                value: '1'
            }, {
                id: 3,
                key: 'two',
                type: 'boolean',
                default: true,
                value: true
            }]);

            // external cache is correct
            assert.deepEqual(cache.getAll(), {
                one: '1',
                two: true
            });
        });

        it('handles value of select not matching updated options', async function () {
            await service.activateTheme('test', {
                name: 'test',
                customSettings: {
                    // no change
                    one: {
                        type: 'select',
                        options: ['1', '2'],
                        default: '2'
                    },
                    // current value is '2' which doesn't match new options
                    two: {
                        type: 'select',
                        options: ['one', 'two'],
                        default: 'two'
                    }
                }
            });

            // updates known setting to match new default
            sinon.assert.calledOnce(model.edit);
            assert.deepEqual(model.edit.getCall(0).firstArg, {value: 'two'});
            assert.deepEqual(model.edit.getCall(0).lastArg, {id: 2, method: 'update'});
        });

        it('handles new settings', async function () {
            await service.activateTheme('test', {
                name: 'test',
                customSettings: {
                    // no change
                    one: {
                        type: 'select',
                        options: ['1', '2'],
                        default: '2'
                    },
                    // no change
                    two: {
                        type: 'select',
                        options: ['1', '2'],
                        default: '1'
                    },
                    // new setting
                    three: {
                        type: 'select',
                        options: ['uno', 'dos', 'tres'],
                        default: 'tres'
                    }
                }
            });

            // new setting is created
            sinon.assert.calledOnce(model.add);
            assert.deepEqual(model.add.getCall(0).firstArg, {
                theme: 'test',
                key: 'three',
                type: 'select',
                value: 'tres'
            });

            // internal cache is correct
            assert.deepEqual(service.listSettings(), [{
                id: 1,
                key: 'one',
                type: 'select',
                options: ['1', '2'],
                default: '2',
                value: '1'
            }, {
                id: 2,
                key: 'two',
                type: 'select',
                options: ['1', '2'],
                default: '1',
                value: '2'
            }, {
                id: 3,
                key: 'three',
                type: 'select',
                options: ['uno', 'dos', 'tres'],
                default: 'tres',
                value: 'tres'
            }]);

            // external cache is correct
            assert.deepEqual(cache.getAll(), {
                one: '1',
                two: '2',
                three: 'tres'
            });
        });

        it('handles activation of new theme when already activated', async function () {
            // activate known theme
            await service.activateTheme('test', {
                name: 'test',
                customSettings: {
                    one: {
                        type: 'select',
                        options: ['1', '2'],
                        default: '2'
                    },
                    two: {
                        type: 'select',
                        options: ['1', '2'],
                        default: '1'
                    }
                }
            });

            // activate new theme
            await service.activateTheme('new', {
                name: 'new',
                customSettings: {
                    typography: {
                        type: 'select',
                        options: ['Serif', 'Sans-serif'],
                        default: 'Sans-serif'
                    },
                    full_cover_image: {
                        type: 'boolean',
                        default: true,
                        group: 'post'
                    }
                }
            });

            // looks for existing settings, then re-fetches after sync. Twice for each activation
            sinon.assert.callCount(model.findAll, 4);
            assert.deepEqual(model.findAll.getCall(0).firstArg, {filter: `theme:'test'`});
            assert.deepEqual(model.findAll.getCall(1).firstArg, {filter: `theme:'test'`});
            assert.deepEqual(model.findAll.getCall(2).firstArg, {filter: `theme:'new'`});
            assert.deepEqual(model.findAll.getCall(3).firstArg, {filter: `theme:'new'`});

            // adds new settings
            sinon.assert.calledTwice(model.add);

            assert.deepEqual(model.add.firstCall.firstArg, {
                theme: 'new',
                key: 'typography',
                type: 'select',
                value: 'Sans-serif'
            });

            assert.deepEqual(model.add.secondCall.firstArg, {
                theme: 'new',
                key: 'full_cover_image',
                type: 'boolean',
                value: true
            });

            // internal cache is correct
            assert.deepEqual(service.listSettings(), [{
                id: 3,
                key: 'typography',
                type: 'select',
                options: ['Serif', 'Sans-serif'],
                default: 'Sans-serif',
                value: 'Sans-serif'
            }, {
                id: 4,
                key: 'full_cover_image',
                type: 'boolean',
                default: true,
                value: true,
                group: 'post'
            }]);

            // external cache is correct
            assert.deepEqual(cache.getAll(), {
                typography: 'Sans-serif',
                full_cover_image: true
            });
        });

        it('exits early if both repository and theme have no settings', async function () {
            await service.activateTheme('no-custom', {name: 'no-custom'});

            sinon.assert.calledOnce(model.findAll);
        });

        it('generates a valid filter string for theme names with dots', async function () {
            await service.activateTheme('4.1.1-test', {
                name: 'casper',
                customSettings: {
                    // 'one' custom setting no longer exists
                    // 'two' - no change
                    two: {
                        type: 'select',
                        options: ['2', '3'],
                        default: '2'
                    }
                }
            });

            sinon.assert.calledTwice(model.findAll);

            assert(model.findAll.getCall(0).firstArg.filter);
            assert.doesNotThrow(() => nql.parse(model.findAll.getCall(0).firstArg.filter));

            assert(model.findAll.getCall(1).firstArg.filter);
            assert.doesNotThrow(() => nql.parse(model.findAll.getCall(1).firstArg.filter));
        });

        it('does not allow simultaneous calls for same theme', async function () {
            service.activateTheme('test', {
                name: 'test',
                customSettings: {
                    // no change
                    one: {
                        type: 'select',
                        options: ['1', '2'],
                        default: '2'
                    },
                    // no change
                    two: {
                        type: 'select',
                        options: ['1', '2'],
                        default: '1'
                    },
                    // new setting
                    three: {
                        type: 'select',
                        options: ['uno', 'dos', 'tres'],
                        default: 'tres'
                    }
                }
            });

            await service.activateTheme('test', {
                name: 'test',
                customSettings: {
                    // no change
                    one: {
                        type: 'select',
                        options: ['1', '2'],
                        default: '2'
                    },
                    // no change
                    two: {
                        type: 'select',
                        options: ['1', '2'],
                        default: '1'
                    },
                    // new setting
                    three: {
                        type: 'select',
                        options: ['uno', 'dos', 'tres'],
                        default: 'tres'
                    }
                }
            });

            // model methods are only called enough times for one .activate call despite being called twice
            sinon.assert.calledTwice(model.findAll);
            sinon.assert.calledOnce(model.add);

            // internal cache is correct
            assert.deepEqual(service.listSettings(), [{
                id: 1,
                key: 'one',
                type: 'select',
                options: ['1', '2'],
                default: '2',
                value: '1'
            }, {
                id: 2,
                key: 'two',
                type: 'select',
                options: ['1', '2'],
                default: '1',
                value: '2'
            }, {
                id: 3,
                key: 'three',
                type: 'select',
                options: ['uno', 'dos', 'tres'],
                default: 'tres',
                value: 'tres'
            }]);

            // external cache is correct
            assert.deepEqual(cache.getAll(), {
                one: '1',
                two: '2',
                three: 'tres'
            });
        });
    });

    describe('listSettings()', function () {
        it('returns empty array when internal cache is empty', function () {
            assert.deepEqual(service.listSettings(), []);
        });
    });

    describe('updateSettings()', function () {
        it('saves new values', async function () {
            // activate theme so settings are loaded in internal cache
            await service.activateTheme('test', {
                name: 'test',
                customSettings: {
                    one: {
                        type: 'select',
                        options: ['1', '2'],
                        default: '2'
                    },
                    two: {
                        type: 'select',
                        options: ['1', '2'],
                        default: '1'
                    }
                }
            });

            // update settings
            const result = await service.updateSettings([{
                id: 1,
                key: 'one',
                type: 'select',
                options: ['1', '2'],
                default: '2',
                value: '2' // was '1'
            }, {
                id: 2,
                key: 'two',
                type: 'select',
                options: ['1', '2'],
                default: '1',
                value: '1' // was '2'
            }]);

            // set + save called on each record
            const firstRecord = model.knownSettings.find(s => s.id === 1);
            sinon.assert.calledOnceWithExactly(firstRecord.set, 'value', '2');
            sinon.assert.calledOnceWithExactly(firstRecord.save, null);

            const secondRecord = model.knownSettings.find(s => s.id === 2);
            sinon.assert.calledOnceWithExactly(secondRecord.set, 'value', '1');
            sinon.assert.calledOnceWithExactly(secondRecord.save, null);

            // return value is correct
            assert.deepEqual(result, [{
                id: 1,
                key: 'one',
                type: 'select',
                options: ['1', '2'],
                default: '2',
                value: '2'
            }, {
                id: 2,
                key: 'two',
                type: 'select',
                options: ['1', '2'],
                default: '1',
                value: '1'
            }]);

            // internal cache is correct
            assert.deepEqual(service.listSettings(), [{
                id: 1,
                key: 'one',
                type: 'select',
                options: ['1', '2'],
                default: '2',
                value: '2'
            }, {
                id: 2,
                key: 'two',
                type: 'select',
                options: ['1', '2'],
                default: '1',
                value: '1'
            }]);

            // external cache is correct
            assert.deepEqual(cache.getAll(), {
                one: '2',
                two: '1'
            });
        });

        it('ignores everything except keys and values', async function () {
            // activate theme so settings are loaded in internal cache
            await service.activateTheme('test', {
                name: 'test',
                customSettings: {
                    one: {
                        type: 'select',
                        options: ['1', '2'],
                        default: '2'
                    },
                    two: {
                        type: 'select',
                        options: ['1', '2'],
                        default: '1'
                    }
                }
            });

            // update settings
            const result = await service.updateSettings([{
                id: 10, // was 1
                key: 'one',
                type: 'unknown', // was 'select'
                options: ['10', '20'], // was ['1', '2']
                default: '20', // was '20'
                value: '2' // was '1'
            }, {
                id: 20, // was 2
                key: 'two',
                type: 'unknown', // was 'select'
                options: ['10', '20'], // was ['1', '2']
                default: '10', // was '1'
                value: '1' // was '2'
            }]);

            // set + save called on each record
            const firstRecord = model.knownSettings.find(s => s.id === 1);
            sinon.assert.calledOnceWithExactly(firstRecord.set, 'value', '2');
            sinon.assert.calledOnceWithExactly(firstRecord.save, null);

            const secondRecord = model.knownSettings.find(s => s.id === 2);
            sinon.assert.calledOnceWithExactly(secondRecord.set, 'value', '1');
            sinon.assert.calledOnceWithExactly(secondRecord.save, null);

            // return value is correct
            assert.deepEqual(result, [{
                id: 1, // change not applied
                key: 'one',
                type: 'select', // change not applied
                options: ['1', '2'], // change not applied
                default: '2', // change not applied
                value: '2'
            }, {
                id: 2, // change not applied
                key: 'two',
                type: 'select', // change not applied
                options: ['1', '2'], // change not applied
                default: '1', // change not applied
                value: '1'
            }]);

            // internal cache is correct
            assert.deepEqual(service.listSettings(), [{
                id: 1,
                key: 'one',
                type: 'select',
                options: ['1', '2'],
                default: '2',
                value: '2'
            }, {
                id: 2,
                key: 'two',
                type: 'select',
                options: ['1', '2'],
                default: '1',
                value: '1'
            }]);

            // external cache is correct
            assert.deepEqual(cache.getAll(), {
                one: '2',
                two: '1'
            });
        });

        it('errors on unknown setting', async function () {
            // activate theme so settings are loaded in internal cache
            await service.activateTheme('test', {
                name: 'test',
                customSettings: {
                    one: {
                        type: 'select',
                        options: ['1', '2'],
                        default: '2'
                    },
                    two: {
                        type: 'select',
                        options: ['1', '2'],
                        default: '1'
                    }
                }
            });

            // update with known and unknown keys
            await assert.rejects(
                service.updateSettings(
                    [{
                        id: 1,
                        key: 'one',
                        type: 'select',
                        options: ['1', '2'],
                        default: '2',
                        value: '1'
                    }, {
                        id: 2,
                        key: 'test',
                        type: 'select',
                        options: ['valid', 'invalid'],
                        default: 'valid',
                        value: 'invalid'
                    }]
                ),
                {
                    name: 'ValidationError',
                    message: 'Unknown setting: test.'
                }
            );
        });

        it('errors on unallowed select value', async function () {
            // activate theme so settings are loaded in internal cache
            await service.activateTheme('test', {
                name: 'test',
                customSettings: {
                    one: {
                        type: 'select',
                        options: ['1', '2'],
                        default: '2'
                    },
                    two: {
                        type: 'select',
                        options: ['1', '2'],
                        default: '1'
                    }
                }
            });

            // update with invalid option value
            await assert.rejects(
                service.updateSettings(
                    [{
                        id: 1,
                        key: 'one',
                        type: 'select',
                        options: ['1', '2'],
                        default: '2',
                        value: 'invalid'
                    }]
                ),
                {
                    name: 'ValidationError',
                    message: 'Unallowed value for \'one\'. Allowed values: 1, 2.'
                }
            );
        });

        it('allows any valid color value', async function () {
            // activate theme so settings are loaded in internal cache
            await service.activateTheme('test', {
                name: 'test',
                customSettings: {
                    one: {
                        type: 'color',
                        default: '#123456'
                    }
                }
            });

            await service.updateSettings(
                [{
                    id: 1,
                    key: 'one',
                    type: 'image',
                    value: '#123456'
                }]
            );

            await service.updateSettings(
                [{
                    id: 1,
                    key: 'one',
                    type: 'image',
                    value: '#FFFFff'
                }]
            );
        });

        it('errors on invalid color values', async function () {
            // activate theme so settings are loaded in internal cache
            await service.activateTheme('test', {
                name: 'test',
                customSettings: {
                    one: {
                        type: 'color',
                        default: '#123456'
                    }
                }
            });

            // update with invalid option value
            await assert.rejects(
                service.updateSettings(
                    [{
                        id: 1,
                        key: 'one',
                        type: 'color',
                        default: '#FFFFFF',
                        value: '#FFFFFFAA'
                    }]
                ),
                {
                    name: 'ValidationError',
                    message: 'Invalid value for \'one\'. The value must follow this format: #1234AF.'
                }
            );
        });

        it('allows any valid boolean value', async function () {
            // activate theme so settings are loaded in internal cache
            await service.activateTheme('test', {
                name: 'test',
                customSettings: {
                    one: {
                        type: 'boolean',
                        default: true
                    }
                }
            });

            await service.updateSettings(
                [{
                    id: 1,
                    key: 'one',
                    type: 'boolean',
                    value: true
                }]
            );

            await service.updateSettings(
                [{
                    id: 1,
                    key: 'one',
                    type: 'boolean',
                    value: false
                }]
            );
        });

        it('errors on invalid boolean values', async function () {
            // activate theme so settings are loaded in internal cache
            await service.activateTheme('test', {
                name: 'test',
                customSettings: {
                    one: {
                        type: 'boolean',
                        default: 'false'
                    }
                }
            });

            // update with invalid option value
            await assert.rejects(
                service.updateSettings(
                    [{
                        id: 1,
                        key: 'one',
                        type: 'boolean',
                        default: 'false',
                        value: 'true'
                    }]
                ),
                {
                    name: 'ValidationError',
                    message: 'Unallowed value for \'one\'. Allowed values: true, false.'
                }
            );
        });

        it('allows any text value', async function () {
            // activate theme so settings are loaded in internal cache
            await service.activateTheme('test', {
                name: 'test',
                customSettings: {
                    one: {
                        type: 'text'
                    }
                }
            });

            await service.updateSettings(
                [{
                    id: 1,
                    key: 'one',
                    type: 'text',
                    value: ''
                }]
            );

            await service.updateSettings(
                [{
                    id: 1,
                    key: 'one',
                    type: 'text',
                    value: null
                }]
            );

            await service.updateSettings(
                [{
                    id: 1,
                    key: 'one',
                    type: 'text',
                    value: 'Long string Long string Long string Long string Long string Long string Long string Long string'
                }]
            );
        });

        it('does not expose hidden settings in the public cache', async function () {
            const HIDDEN_SETTING_VALUE = null;

            const settingName = 'foo';
            const settingDefinition = {
                type: 'select',
                options: ['Foo', 'Bar', 'Baz'],
                default: 'Foo',
                visibility: 'some_other_setting:bar'
            };

            await service.activateTheme('test', {
                name: 'test',
                customSettings: {
                    [settingName]: settingDefinition
                }
            });

            await service.updateSettings(
                [{
                    key: settingName,
                    value: 'Foo',
                    ...settingDefinition
                }]
            );

            assert.deepEqual(cache.getAll(), {
                [settingName]: HIDDEN_SETTING_VALUE
            });
        });
    });
});
