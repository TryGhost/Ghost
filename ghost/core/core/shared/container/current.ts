/**
 * Process-level access to the DI container. Legacy facades resolve through
 * getCurrentScope(); this indirection is the single seam where multi-tenant
 * scope selection would plug in later.
 */

import {createContainer, Container, Scope, ContainerResolutionError} from './container';

let root: Container | null = null;
let defaultScope: Scope | null = null;

export const getRootContainer = (): Container => {
    root = root ?? createContainer();
    return root;
};

export const setDefaultScope = (scope: Scope): void => {
    defaultScope = scope;
};

export const getCurrentScope = (): Scope => {
    if (!defaultScope) {
        throw new ContainerResolutionError({message: 'No default scope set — the container is wired during boot'});
    }
    return defaultScope;
};

export const resetContainer = (): void => {
    root = null;
    defaultScope = null;
};
