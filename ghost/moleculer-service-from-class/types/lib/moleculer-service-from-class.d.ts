export = createMoleculerServiceSchema;
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
declare function createMoleculerServiceSchema<Type extends {
    _init(): Promise<void>;
}>({ Service, name, serviceDeps, staticDeps, forceSingleton, version }: {
    Service: new (arg1: any) => Type;
    name: string;
    serviceDeps?: {
        [x: string]: ServiceDefinition;
    };
    staticDeps?: {
        [x: string]: any;
    };
    forceSingleton?: boolean;
    version?: string;
}): import("moleculer").ServiceSchema<import("moleculer").ServiceSettingSchema>;
declare namespace createMoleculerServiceSchema {
    export { Service, Class, ServiceDefinition };
}
type ServiceDefinition = {
    name: string;
    version: string;
};
type Service = any;
/**
 * <Type>
 */
type Class<Type> = new (arg1: any) => Type;
