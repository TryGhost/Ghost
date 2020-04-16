const should = require('should');
const sinon = require('sinon');
const moleculer = require('moleculer');
const createMoleculerServiceFromClass = require('../');

const hasOwnProperty = Object.prototype.hasOwnProperty.call.bind(Object.prototype.hasOwnProperty);

describe('MoleculerServiceFromClass', function () {
    it('Exposes name & methods as actions (excluding private & constructor) as well as a default ping', function () {
        class Dep {
            async _init() {}
            async _privateMethod() {}
            async someMethod() {
                return 5;
            }
        }

        const service = createMoleculerServiceFromClass({Service: Dep, name: 'dep'});

        const name = service.name;
        const actions = service.actions;

        should.equal(name, 'dep');

        should.equal(hasOwnProperty(actions, '_privateMethod'), false);
        should.equal(hasOwnProperty(actions, 'constructor'), false);

        should.equal(hasOwnProperty(actions, 'someMethod'), true);
        should.equal(hasOwnProperty(actions, 'ping'), true);
    });

    it('Wires up dynamic and static dependencies correctly', async function () {
        const fakeStaticDep = 13;
        class Dep {
            async _init() {}
            constructor({staticDep}) {
                this._staticDep = staticDep;
                should.equal(staticDep, fakeStaticDep);
            }
            async someMethod() {
                return this._staticDep;
            }
        }

        class Main {
            async _init() {}
            /**
             * @param {object} deps
             * @param {Dep} deps.dep
             */
            constructor({dep}) {
                this._dep = dep;
            }

            async someOtherMethod() {
                const num = await this._dep.someMethod();
                return num * 2;
            }
        }

        const depService = createMoleculerServiceFromClass({Service: Dep, name: 'dep', staticDeps: {
            staticDep: fakeStaticDep
        }});

        const mainService = createMoleculerServiceFromClass({Service: Main, name: 'main', serviceDeps: {
            dep: 'dep'
        }});

        const broker = new moleculer.ServiceBroker({logger: false});
        broker.createService(depService);
        broker.createService(mainService);

        await broker.start();

        const someMethod = sinon.spy(Dep.prototype, 'someMethod');
        const someOtherMethod = sinon.spy(Main.prototype, 'someOtherMethod');

        const result = await broker.call('main.someOtherMethod');

        should.equal(someMethod.called, true);
        should.equal(someOtherMethod.called, true);
        should.equal(result, 26);

        await broker.stop();
    });
});
