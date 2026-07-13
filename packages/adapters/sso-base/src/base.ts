import type {Request} from 'express';

export interface User {
    id: string;
}

export interface SSOAdapter<Token, Lookup> {
    getRequestCredentials(request: Request): Promise<Token | null>;
    getIdentityFromCredentials(credentials: Token): Promise<Lookup | null>;
    getUserForIdentity(identity: Lookup): Promise<User | null>;
}

export abstract class SSOBase<Token, Lookup> implements SSOAdapter<Token, Lookup> {
    declare readonly requiredFns: readonly ['getRequestCredentials', 'getIdentityFromCredentials', 'getUserForIdentity'];

    constructor() {
        Object.defineProperty(this, 'requiredFns', {
            value: Object.freeze(['getRequestCredentials', 'getIdentityFromCredentials', 'getUserForIdentity']),
            writable: false,
        });
    }

    abstract getRequestCredentials(request: Request): Promise<Token | null>;
    abstract getIdentityFromCredentials(credentials: Token): Promise<Lookup | null>;
    abstract getUserForIdentity(identity: Lookup): Promise<User | null>;
}
