import type {Request} from 'express';
import errors from '@tryghost/errors';

export interface User {
    id: string;
    email: string;
}

/**
 * A small set of user lookups that Ghost injects into the SSO adapter, so that
 * adapter implementations can resolve users without reaching into Ghost's model
 * layer directly.
 *
 * Ghost core provides the implementation (backed by the User model) via
 * `SSOBase.setUserRepository`; adapter implementations consume it through the
 * protected `getUserByEmail` / `getOwnerUser` helpers on `SSOBase`.
 */
export interface UserRepository {
    /** Look up a single user by their email address, or `null` if none exists. */
    getByEmail(email: string): Promise<User | null>;
    /** Look up the site owner user, or `null` if none exists. */
    getOwner(): Promise<User | null>;
}

export interface SSOAdapter<Token, Lookup> {
    getRequestCredentials(request: Request): Promise<Token | null>;
    getIdentityFromCredentials(credentials: Token): Promise<Lookup | null>;
    getUserForIdentity(identity: Lookup): Promise<User | null>;
}

export abstract class SSOBase<Token, Lookup> implements SSOAdapter<Token, Lookup> {
    declare readonly requiredFns: readonly ['getRequestCredentials', 'getIdentityFromCredentials', 'getUserForIdentity'];

    #userRepository: UserRepository | null = null;

    constructor() {
        Object.defineProperty(this, 'requiredFns', {
            value: Object.freeze(['getRequestCredentials', 'getIdentityFromCredentials', 'getUserForIdentity']),
            writable: false,
        });
    }

    /**
     * Inject the user repository. Ghost core calls this after constructing the
     * adapter, supplying an implementation backed by the User model. Adapter
     * implementations should not call this themselves.
     */
    setUserRepository(userRepository: UserRepository): void {
        this.#userRepository = userRepository;
    }

    get #users(): UserRepository {
        if (!this.#userRepository) {
            throw new errors.IncorrectUsageError({
                message: 'SSO adapter has no user repository configured. Ghost must call setUserRepository() before the adapter is used.'
            });
        }
        return this.#userRepository;
    }

    /**
     * Look up a single user by email. Available to adapter implementations so
     * they can resolve users without depending on Ghost's model layer.
     */
    protected async getUserByEmail(email: string): Promise<User | null> {
        return this.#users.getByEmail(email);
    }

    /**
     * Look up the site owner user. Available to adapter implementations so they
     * can resolve the owner without depending on Ghost's model layer.
     */
    protected async getOwnerUser(): Promise<User | null> {
        return this.#users.getOwner();
    }

    abstract getRequestCredentials(request: Request): Promise<Token | null>;
    abstract getIdentityFromCredentials(credentials: Token): Promise<Lookup | null>;
    abstract getUserForIdentity(identity: Lookup): Promise<User | null>;
}
