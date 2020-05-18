const moleculer = require('moleculer');

/**
 * @typedef {object} Service
 */

/**
 * @template Type
 * @typedef {function(new: Type, object)} Class<Type>
 */

/**
 * Creates a naive "proxy" method which calls a moleculer service's method
 * passing the first argument as the `params` to the moleculer service call
 * It also binds the ctx correctly to allow for nested service calls
 *
 * @param {moleculer.Context} ctx
 * @param {string} serviceName - The name of the service in the moleculer cluster
 * @param {string} methodName - The name of the moleculer "action" on the service
 * @param {string} serviceVersion - The version of the service in the moleculer cluster
 *
 * @returns {(params: object) => Promise<any>}
 */
function proxy(ctx, serviceName, methodName, serviceVersion) {
    return async params => ctx.call(`${serviceVersion}.${serviceName}.${methodName}`, params);
}

/**
 * Get the method names of the service
 *
 * @param {Class<any>} Class
 *
 * @returns {string[]} A list of the methods names for Class
 */
function getClassMethods(Class) {
    return Reflect.ownKeys(Class.prototype).reduce((methods, key) => {
        if (typeof Class.prototype[key] !== 'function') {
            return methods;
        }
        if (key === 'constructor' || key.toString().startsWith('_')) {
            return methods;
        }
        return methods.concat(key);
    }, []);
}

/**
 * createServiceProxy
 *
 * @param {moleculer.Context} ctx
 * @param {string} serviceName
 * @param {string} serviceVersion
 * @returns {Promise<object>}
 */
async function createServiceProxy(ctx, serviceName, serviceVersion) {
    await ctx.broker.waitForServices([{
        name: serviceName,
        version: serviceVersion
    }]);
    /** @type {{action: {name: string, rawName: string}}[]} */
    const actionsList = await ctx.call('$node.actions');

    const serviceMethods = actionsList.filter((obj) => {
        const isValidAction = obj && obj.action;
        if (!isValidAction) {
            ctx.broker.logger.debug(`Recieved invalid action ${JSON.stringify(obj)}`);
            return false;
        }
        const belongsToService = obj.action.name.startsWith(`${serviceVersion}.${serviceName}.`);

        return belongsToService;
    }).map(obj => obj.action.rawName);

    return serviceMethods.reduce((serviceProxy, methodName) => {
        ctx.broker.logger.debug(`Creating proxy ${serviceName}.${methodName}`);
        return Object.assign(serviceProxy, {
            [methodName]: proxy(ctx, serviceName, methodName, serviceVersion)
        });
    }, []);
}

/**
 * @typedef {Object} ServiceDefinition
 * @prop {string} name
 * @prop {string} version
 */

/**
 * Create a ServiceSchema compatible with moleculer
 *
 * @template {{_init(): Promise<void>}} Type
 *
 * @param {object} params The Service to proxy via moleculer
 * @param {Class<Type>} params.Service The Service to proxy via moleculer
 * @param {string} params.name The name of the service in moleculer
 * @param {Object.<string, ServiceDefinition>} [params.serviceDeps] A map of dependencies with a key of the param name and value of the moleculer service
 * @param {Object.<string, any>} [params.staticDeps] Any static dependencies which do not need to be proxied by moleculer
 * @param {boolean} [params.forceSingleton=false] Forces the wrapper to only ever create once instance of Service
 * @param {string} [params.version='1'] Forces the wrapper to only ever create once instance of Service
 *
 * @returns {moleculer.ServiceSchema}
 */
function createMoleculerServiceSchema({Service, name, serviceDeps = null, staticDeps = null, forceSingleton = false, version = '1'}) {
    const methods = getClassMethods(Service);

    /**
     * Creates an instance of the service - wiring and mapping any dependencies
     *
     * @param {moleculer.Context} ctx
     * @returns {Promise<Type>}
     */
    async function getDynamicServiceInstance(ctx) {
        const instanceDeps = Object.create(serviceDeps);
        if (serviceDeps) {
            for (const dep in serviceDeps) {
                const serviceDefinition = serviceDeps[dep];
                const serviceName = serviceDefinition.name;
                const serviceVersion = serviceDefinition.version;
                const serviceProxy = await createServiceProxy(ctx, serviceName, serviceVersion);
                instanceDeps[dep] = serviceProxy;
            }
        }
        instanceDeps.logging = ctx.broker.logger;
        Object.assign(instanceDeps, staticDeps);

        const service = new Service(instanceDeps);
        return service;
    }

    let singleton = null;
    /**
     * Ensures that the Service is only instantiated once
     *
     * @param {moleculer.Context} ctx
     * @returns {Promise<Type>}
     */
    async function getSingletonServiceInstance(ctx) {
        if (singleton) {
            return singleton;
        }
        singleton = await getDynamicServiceInstance(ctx);
        if (singleton._init) {
            await singleton._init();
        }
        return singleton;
    }

    const getServiceInstance = (!serviceDeps || forceSingleton) ? getSingletonServiceInstance : getDynamicServiceInstance;

    /** @type moleculer.ServiceActionsSchema */
    const actions = {
        ping() {
            return 'pong';
        }
    };

    for (const method of methods) {
        /** @type {(ctx: moleculer.Context) => Promise<any>} */
        actions[method] = async function (ctx) {
            const service = await getServiceInstance(ctx);
            return service[method](ctx.params);
        };
    }

    return {
        name,
        version,
        actions,
        async started() {
            const ctx = new moleculer.Context(this.broker, null);
            await getServiceInstance(ctx);
        }
    };
}

module.exports = createMoleculerServiceSchema;
