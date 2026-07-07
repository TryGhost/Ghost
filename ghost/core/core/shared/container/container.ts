/**
 * Minimal dependency-injection container: a root holding registrations and
 * SINGLETON instances, with scopes holding SCOPED instances and seed values.
 *
 * Factories receive a cradle object and destructure dependencies by name
 * (Awilix PROXY-mode compatible). Singleton factories resolve against the
 * root, so a singleton can never capture scoped state — construction-time or
 * deferred.
 */

import errors from '@tryghost/errors';

type Lifetime = 'SINGLETON' | 'SCOPED';

export type Cradle = Record<string, any>;

export interface Registration {
    lifetime: Lifetime;
    factory: (cradle: Cradle) => unknown;
    dispose?: (instance: unknown) => void | Promise<void>;
    eager?: boolean;
}

export class ContainerResolutionError extends errors.IncorrectUsageError {}

type Resolver = (name: string, stack: string[]) => unknown;

const pathTo = (stack: string[], name: string) => [...stack, name].join(' -> ');

const createCradle = (resolve: Resolver, stack: string[]): Cradle => {
    return new Proxy({}, {
        get(_, prop) {
            if (typeof prop === 'symbol') {
                return undefined;
            }
            return resolve(prop, stack);
        }
    });
};

class InstanceCache {
    private instances = new Map<string, unknown>();
    private order: string[] = [];
    disposed = false;

    has(name: string) {
        return this.instances.has(name);
    }

    get(name: string) {
        return this.instances.get(name);
    }

    set(name: string, instance: unknown) {
        this.instances.set(name, instance);
        this.order.push(name);
    }

    async dispose(registrations: Map<string, Registration>) {
        this.disposed = true;
        for (const name of [...this.order].reverse()) {
            const registration = registrations.get(name);
            if (registration?.dispose) {
                await registration.dispose(this.instances.get(name));
            }
        }
        this.instances.clear();
        this.order = [];
    }
}

class Scope {
    private root: Container;
    private seeds: Cradle;
    private cache = new InstanceCache();

    constructor(root: Container, seeds: Cradle) {
        this.root = root;
        this.seeds = seeds;
    }

    resolve(name: string, stack: string[] = []): unknown {
        if (this.cache.disposed) {
            throw new ContainerResolutionError({message: `Cannot resolve '${name}' from a disposed scope`});
        }
        if (name in this.seeds) {
            return this.seeds[name];
        }

        const registration = this.root.registrations.get(name);
        if (!registration) {
            throw new ContainerResolutionError({message: `Unknown registration '${name}' (resolution path: ${pathTo(stack, name)})`});
        }
        if (registration.lifetime === 'SINGLETON') {
            return this.root.resolve(name, stack);
        }
        if (stack.includes(name)) {
            throw new ContainerResolutionError({message: `Dependency cycle: ${pathTo(stack, name)}`});
        }

        if (!this.cache.has(name)) {
            stack.push(name);
            try {
                this.cache.set(name, registration.factory(createCradle(this.resolve.bind(this), stack)));
            } finally {
                stack.pop();
            }
        }
        return this.cache.get(name);
    }

    init() {
        for (const [name, registration] of this.root.registrations) {
            if (registration.eager) {
                this.resolve(name);
            }
        }
    }

    async dispose() {
        await this.cache.dispose(this.root.registrations);
    }
}

class Container {
    registrations = new Map<string, Registration>();
    private cache = new InstanceCache();

    register(name: string, registration: Registration) {
        if (this.registrations.has(name)) {
            throw new ContainerResolutionError({message: `'${name}' is already registered`});
        }
        this.registrations.set(name, registration);
    }

    createScope(seeds: Cradle = {}) {
        return new Scope(this, seeds);
    }

    resolve(name: string, stack: string[] = []): unknown {
        if (this.cache.disposed) {
            throw new ContainerResolutionError({message: `Cannot resolve '${name}' from a disposed container`});
        }

        const registration = this.registrations.get(name);
        if (!registration) {
            throw new ContainerResolutionError({
                message: `'${name}' is not registered on the root container. ` +
                    `Seeds and scoped values cannot be reached from a singleton (captive dependency). ` +
                    `(resolution path: ${pathTo(stack, name)})`
            });
        }
        if (registration.lifetime === 'SCOPED') {
            if (stack.length > 0) {
                throw new ContainerResolutionError({
                    message: `Captive dependency: singleton '${stack[stack.length - 1]}' cannot depend on scoped '${name}' ` +
                        `(resolution path: ${pathTo(stack, name)})`
                });
            }
            throw new ContainerResolutionError({message: `Cannot resolve scoped registration '${name}' from the root container`});
        }
        if (stack.includes(name)) {
            throw new ContainerResolutionError({message: `Dependency cycle: ${pathTo(stack, name)}`});
        }

        if (!this.cache.has(name)) {
            stack.push(name);
            try {
                this.cache.set(name, registration.factory(createCradle(this.resolve.bind(this), stack)));
            } finally {
                stack.pop();
            }
        }
        return this.cache.get(name);
    }

    async dispose() {
        await this.cache.dispose(this.registrations);
    }
}

export type {Container, Scope};

export const createContainer = () => new Container();
