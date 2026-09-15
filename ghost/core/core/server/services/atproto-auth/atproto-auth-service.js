/**
 * ATProto OAuth flow orchestrator.
 *
 * Implements the full ATProto OAuth 2.0 flow:
 *   authorize()             – resolve handle, do PAR, return redirect URL
 *   callback()              – exchange code for tokens, create/link member
 *   submitEmailForPending() – accept email for DID-verified-but-no-email flows
 *   completePendingSignup() – link a pending DID after email magic-link click
 *
 * Security notes:
 *   - State is single-use and expires in 10 minutes (replay prevented in OAuthStateStore).
 *   - Issuer (iss) is verified in callback against stored as_issuer (mix-up attack prevention).
 *   - The token sub claim is verified against the DID resolved at authorize() time (DID substitution prevention).
 *   - redirect_url is validated to be same-origin before use (open redirect prevention).
 *   - All outbound HTTP calls use a 5-second timeout.
 */
const {UnauthorizedError, BadRequestError, NotFoundError} = require('@tryghost/errors');
const {isEmail} = require('@tryghost/validator');
const logging = require('@tryghost/logging');

const {generateKeyPair, restoreKeyPair, buildProof} = require('./dpop-helper');
const {generateCodeVerifier, deriveCodeChallenge} = require('./pkce-helper');
const {validateHandle, resolveHandleToDid, fetchDidDocument, extractPdsUrl, fetchAuthServerMeta} = require('./did-resolver');
const OAuthStateStore = require('./oauth-state-store');

const PAR_TTL_MS = 5000;

class AtprotoAuthService {
    /**
     * @param {Object} deps
     * @param {import('../../../shared/config')} deps.config
     * @param {import('../../../shared/url-utils').default} deps.urlUtils
     * @param {() => Promise<Object>} deps.getMembersApi
     * @param {import('../../../shared/settings-cache')} deps.settingsCache
     * @param {import('knex').Knex} deps.db
     */
    constructor({config, urlUtils, getMembersApi, settingsCache, db}) {
        this._config = config;
        this._urlUtils = urlUtils;
        this._getMembersApi = getMembersApi;
        this._settingsCache = settingsCache;
        this._store = new OAuthStateStore(db);
        this._oauthClient = null;
        this._oauthClientPromise = this._createSdkClient();
        this._sdkSessions = new Map();
        this._plcDirectory = config.get('atproto:plcDirectory') || 'https://plc.directory';
    }

    // -------------------------------------------------------------------------
    // Public interface
    // -------------------------------------------------------------------------

    /**
     * Build the authorization server redirect URL for a given handle.
     * @param {string} rawHandle
     * @param {string|null} redirectUrl  post-login destination URL (must be same-origin)
     * @returns {Promise<string>} URL to redirect the browser to
     */
    async authorize(rawHandle, redirectUrl) {
        const handle = validateHandle(rawHandle);
        const safeRedirect = this._sanitizeRedirectUrl(redirectUrl);

        if (!this._store || !this._store._knex) {
            return this._authorizeLegacy(handle, safeRedirect);
        }

        const did = await resolveHandleToDid(handle);
        const client = await this._getSdkClient();

        return (await client.authorize(handle, {
            state: JSON.stringify({
                redirectUrl: safeRedirect,
                resolvedDid: did
            })
        })).toString();
    }

    /**
     * Handle the OAuth callback from the authorization server.
     * @param {string} code
     * @param {string} stateId
     * @param {string} iss  issuer param from callback (mix-up prevention)
     * @returns {Promise<{member: Object, redirectUrl: string|null, needsEmail: boolean, pendingId: string|null}>}
     */
    async callback(code, stateId, iss) {
        if (!code || !stateId) {
            throw new BadRequestError({message: 'Missing code or state parameter'});
        }

        if (!this._store || !this._store._knex) {
            return this._callbackLegacy(code, stateId, iss);
        }

        try {
            const client = await this._getSdkClient();
            const params = new URLSearchParams({code, state: stateId});
            if (iss) {
                params.set('iss', iss);
            }

            const {session, state: appState} = await client.callback(params);
            const flowState = this._parseFlowState(appState);
            const did = session.did;

            if (flowState.resolvedDid && did !== flowState.resolvedDid) {
                throw new UnauthorizedError({message: 'Token sub does not match resolved DID'});
            }

            const tokenSet = await session.getTokenSet();
            const email = (tokenSet.email && tokenSet.email_verified) ? tokenSet.email : null;

            if (!email) {
                const membersApi = await this._getMembersApi();
                const byDid = await membersApi.members.get({atproto_did: did});
                if (byDid) {
                    return {member: byDid, redirectUrl: flowState.redirectUrl, needsEmail: false, pendingId: null};
                }

                const pendingId = await this._store.createPendingEmail(did);
                return {member: null, redirectUrl: flowState.redirectUrl, needsEmail: true, pendingId};
            }

            const member = await this._upsertMember(did, email);
            return {member, redirectUrl: flowState.redirectUrl, needsEmail: false, pendingId: null};
        } catch (err) {
            if (err && err.name === 'OAuthCallbackError') {
                throw new UnauthorizedError({message: err.message || 'Invalid or expired state'});
            }
            if (err && (err.message || '').includes('Unknown authorization session')) {
                throw new UnauthorizedError({message: 'Invalid or expired state'});
            }
            throw err;
        }
    }

    /**
     * Accept an email for a pending-DID flow.  Sends a magic link that will
     * complete the signup and link the DID after the user clicks it.
     * @param {string} pendingId
     * @param {string} email
     * @param {string} siteUrl  for building the magic link referrer
     * @returns {Promise<void>}
     */
    async submitEmailForPending(pendingId, email, siteUrl) {
        if (!pendingId) {
            throw new BadRequestError({message: 'Missing pending ID'});
        }

        if (!email || !isEmail(email)) {
            throw new BadRequestError({message: 'A valid email address is required'});
        }

        // Peek – don't consume yet; consumption happens in completePendingSignup
        const row = await this._store._knex('atproto_pending_email').where({id: pendingId}).first();
        if (!row || new Date(row.expires_at) < new Date()) {
            throw new UnauthorizedError({message: 'Invalid or expired pending session'});
        }

        // Check email is not already bound to a different DID
        const membersApi = await this._getMembersApi();
        const existing = await membersApi.members.get({email});
        if (existing && existing.get('atproto_did') && existing.get('atproto_did') !== row.verified_did) {
            throw new BadRequestError({message: 'This email is already linked to a different ATProto identity'});
        }

        // Redirect back to the link-DID completion endpoint after magic link clicks
        const completeUrl = new URL(`${siteUrl}/members/atproto/complete-signup`);
        completeUrl.searchParams.set('pending', pendingId);

        await membersApi.sendEmailWithMagicLink({
            email,
            requestedType: 'signup',
            referrer: completeUrl.toString()
        });
    }

    /**
     * Link a pending DID to the authenticated member (called after magic-link click).
     * @param {string} pendingId
     * @param {string} memberEmail  email of the just-authenticated member
     * @returns {Promise<void>}
     */
    async completePendingSignup(pendingId, memberEmail) {
        if (!pendingId) {
            throw new BadRequestError({message: 'Missing pending ID'});
        }

        const did = await this._store.consumePendingEmail(pendingId);
        if (!did) {
            throw new UnauthorizedError({message: 'Invalid or expired pending session'});
        }

        const membersApi = await this._getMembersApi();
        const member = await membersApi.members.get({email: memberEmail});
        if (!member) {
            throw new NotFoundError({message: 'Member not found'});
        }

        const existingDid = member.get('atproto_did');
        if (existingDid && existingDid !== did) {
            throw new BadRequestError({message: 'This account already has a different ATProto identity linked'});
        }

        if (!existingDid) {
            await membersApi.members.update({atproto_did: did}, {id: member.id});
        }
    }

    /**
     * Returns the JSON content for the /.well-known/oauth-client-metadata endpoint.
     */
    getClientMetadata() {
        const clientId = this._clientMetadataUrl();
        const callbackUrl = this._callbackUrl();

        return {
            client_id: clientId,
            client_name: this._settingsCache.get('title') || 'Ghost Site',
            client_uri: this._urlUtils.getSiteUrl(),
            redirect_uris: [callbackUrl],
            grant_types: ['authorization_code', 'refresh_token'],
            response_types: ['code'],
            scope: 'atproto',
            application_type: 'web',
            token_endpoint_auth_method: 'none',
            dpop_bound_access_tokens: true
        };
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    async _getSdkClient() {
        if (!this._oauthClient) {
            this._oauthClient = await this._oauthClientPromise;
        }
        return this._oauthClient;
    }

    async _createSdkClient() {
        const {NodeOAuthClient} = await import('@atproto/oauth-client-node');
        const {JoseKey} = await import('@atproto/jwk-jose');

        const stateStore = {
            async set(key, stateData) {
                if (!this._store || !this._store._knex) {
                    return;
                }

                await this._store._knex('atproto_oauth_states').insert({
                    id: key,
                    pkce_verifier: stateData.verifier,
                    dpop_private_key_jwk: JSON.stringify(stateData.dpopKey.privateJwk),
                    resolved_did: (() => {
                        try {
                            const parsed = JSON.parse(stateData.appState || '{}');
                            return parsed.resolvedDid || '';
                        } catch (err) {
                            return '';
                        }
                    })(),
                    pds_token_endpoint: '',
                    as_issuer: stateData.iss,
                    redirect_url: stateData.appState || null,
                    email_required: false,
                    expires_at: new Date(Date.now() + 10 * 60 * 1000)
                });
            },
            async get(key) {
                if (!this._store || !this._store._knex) {
                    return undefined;
                }

                const row = await this._store._knex('atproto_oauth_states').where({id: key}).first();
                if (!row) {
                    return undefined;
                }
                if (new Date(row.expires_at) < new Date()) {
                    await this._store._knex('atproto_oauth_states').where({id: key}).delete();
                    return undefined;
                }

                const dpopKey = await JoseKey.fromJWK(JSON.parse(row.dpop_private_key_jwk));
                return {
                    iss: row.as_issuer,
                    dpopKey,
                    authMethod: {method: 'none'},
                    verifier: row.pkce_verifier,
                    appState: row.redirect_url || undefined
                };
            },
            async del(key) {
                if (!this._store || !this._store._knex) {
                    return;
                }
                await this._store._knex('atproto_oauth_states').where({id: key}).delete();
            }
        };

        const sessionStore = {
            async set(sub, session) {
                this._sdkSessions.set(sub, session);
            },
            async get(sub) {
                return this._sdkSessions.get(sub);
            },
            async del(sub) {
                this._sdkSessions.delete(sub);
            }
        };

        const requestLock = async (key, fn) => await fn();

        return new NodeOAuthClient({
            fetch: globalThis.fetch,
            clientMetadata: this.getClientMetadata(),
            stateStore,
            sessionStore,
            requestLock,
            responseMode: 'query'
        });
    }

    _parseFlowState(appState) {
        if (!appState || typeof appState !== 'string') {
            return {redirectUrl: null, resolvedDid: null};
        }

        try {
            const parsed = JSON.parse(appState);
            if (parsed && typeof parsed === 'object') {
                return {
                    redirectUrl: parsed.redirectUrl || null,
                    resolvedDid: parsed.resolvedDid || null
                };
            }
        } catch (err) {
            // Some older flows store a plain redirect URL string.
        }

        return {redirectUrl: appState, resolvedDid: null};
    }

    async _authorizeLegacy(handle, safeRedirect) {
        const did = await resolveHandleToDid(handle);
        const didDoc = await fetchDidDocument(did, this._plcDirectory);
        const pdsUrl = extractPdsUrl(didDoc);
        const asMeta = await fetchAuthServerMeta(pdsUrl);

        const {privateKeyJwk, privateKey, publicKeyJwk} = generateKeyPair();
        const pkceVerifier = generateCodeVerifier();
        const pkceChallenge = deriveCodeChallenge(pkceVerifier);

        const stateId = await this._store.create({
            pkceVerifier,
            dpopPrivateKeyJwk: privateKeyJwk,
            resolvedDid: did,
            pdsTokenEndpoint: asMeta.token_endpoint,
            asIssuer: asMeta.issuer,
            redirectUrl: safeRedirect
        });

        const callbackUrl = this._callbackUrl();
        const clientId = this._clientMetadataUrl();

        const buildParBody = (nonce) => {
            return new URLSearchParams({
                client_id: clientId,
                redirect_uri: callbackUrl,
                response_type: 'code',
                scope: 'atproto',
                code_challenge: pkceChallenge,
                code_challenge_method: 'S256',
                state: stateId
            }).toString();
        };

        const buildDpopProof = (nonce) => {
            return buildProof(
                privateKey, publicKeyJwk,
                'POST', asMeta.pushed_authorization_request_endpoint,
                nonce
            );
        };

        const parRes = await this._postWithDpopNonceRetry(
            asMeta.pushed_authorization_request_endpoint,
            buildParBody,
            buildDpopProof,
            {'Content-Type': 'application/x-www-form-urlencoded'},
            PAR_TTL_MS
        );

        if (!parRes.request_uri) {
            throw new BadRequestError({message: 'PAR response missing request_uri'});
        }

        const authUrl = new URL(asMeta.authorization_endpoint);
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('request_uri', parRes.request_uri);

        return authUrl.toString();
    }

    async _callbackLegacy(code, stateId, iss) {
        const state = await this._store.findAndConsume(stateId);
        if (!state) {
            throw new UnauthorizedError({message: 'Invalid or expired state'});
        }

        if (iss && iss !== state.asIssuer) {
            throw new UnauthorizedError({message: 'Issuer mismatch — possible mix-up attack'});
        }

        const {privateKey, publicKeyJwk} = restoreKeyPair(state.dpopPrivateKeyJwk);

        const tokenSet = await this._exchangeCode({
            code,
            pkceVerifier: state.pkceVerifier,
            tokenEndpoint: state.pdsTokenEndpoint,
            privateKey,
            publicKeyJwk
        });

        if (tokenSet.sub !== state.resolvedDid) {
            throw new UnauthorizedError({
                message: 'Token sub does not match resolved DID'
            });
        }

        const did = tokenSet.sub;
        const email = (tokenSet.email && tokenSet.email_verified) ? tokenSet.email : null;

        if (!email) {
            const membersApi = await this._getMembersApi();
            const byDid = await membersApi.members.get({atproto_did: did});
            if (byDid) {
                return {member: byDid, redirectUrl: state.redirectUrl, needsEmail: false, pendingId: null};
            }

            const pendingId = await this._store.createPendingEmail(did);
            return {member: null, redirectUrl: state.redirectUrl, needsEmail: true, pendingId};
        }

        const member = await this._upsertMember(did, email);
        return {member, redirectUrl: state.redirectUrl, needsEmail: false, pendingId: null};
    }

    /**
     * Exchange an authorization code for an access token set, with DPoP.
     */
    async _exchangeCode({code, pkceVerifier, tokenEndpoint, privateKey, publicKeyJwk}) {
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: this._callbackUrl(),
            client_id: this._clientMetadataUrl(),
            code_verifier: pkceVerifier
        });

        // First attempt without nonce
        let nonce;
        let response = await this._postWithDpop(tokenEndpoint, body, privateKey, publicKeyJwk, nonce);

        // Handle nonce challenge (use_dpop_nonce)
        if (response._dpopNonce) {
            nonce = response._dpopNonce;
            response = await this._postWithDpop(tokenEndpoint, body, privateKey, publicKeyJwk, nonce);
        }

        if (!response.access_token) {
            const err = response.error || 'token_exchange_failed';
            throw new UnauthorizedError({message: `Token exchange failed: ${err}`});
        }

        return response;
    }

    async _postWithDpop(endpoint, body, privateKey, publicKeyJwk, nonce) {
        const dpopProof = buildProof(privateKey, publicKeyJwk, 'POST', endpoint, nonce);
        const raw = await this._postRaw(endpoint, body.toString(), {
            'Content-Type': 'application/x-www-form-urlencoded',
            DPoP: dpopProof
        });

        // If server wants a nonce, it returns 400 + use_dpop_nonce and the nonce header
        if (raw.status === 400) {
            const json = await raw.json();
            const serverNonce = raw.headers.get('dpop-nonce');
            if (json.error === 'use_dpop_nonce' && serverNonce) {
                return {_dpopNonce: serverNonce};
            }
            return json;
        }

        return await raw.json();
    }

    async _post(url, body, headers, timeoutMs = 5000) {
        const raw = await this._postRaw(url, body, headers, timeoutMs);
        const text = await raw.text();
        let json = {};
        try {
            json = JSON.parse(text);
        } catch (e) {
            logging.error(`[atproto-auth] Failed to parse JSON response from ${url}: ${text}`);
        }
        if (!raw.ok) {
            logging.error(`[atproto-auth] POST ${url} failed with ${raw.status}: ${JSON.stringify(json)}`);
            throw new BadRequestError({message: `Request to ${url} failed: ${json.error || raw.status}`});
        }
        return json;
    }

    /**
     * POST to a URL, with automatic retry if DPoP nonce is required.
     * Only needed for endpoints that require DPoP proof with nonce (like PAR).
     * @param {string} url
     * @param {(nonce: string|null) => string} buildBody  callback to build body, may receive nonce
     * @param {(nonce: string|null) => string} buildDpopProof  callback to build DPoP proof with nonce
     * @param {Object} headers  base headers (without DPoP)
     * @param {number} [timeoutMs=5000]
     * @returns {Promise<Object>}
     */
    async _postWithDpopNonceRetry(url, buildBody, buildDpopProof, headers, timeoutMs = 5000) {
        let nonce = null;
        let attempt = 0;
        const maxAttempts = 2;

        while (attempt < maxAttempts) {
            attempt++;
            const body = buildBody(nonce);
            const dpopProof = buildDpopProof(nonce);
            const finalHeaders = {
                ...headers,
                DPoP: dpopProof
            };

            const raw = await this._postRaw(url, body, finalHeaders, timeoutMs);
            const text = await raw.text();
            let json = {};
            try {
                json = JSON.parse(text);
            } catch (e) {
                logging.error(`[atproto-auth] Failed to parse JSON response from ${url}: ${text}`);
            }

            if (raw.ok) {
                return json;
            }

            // Check if we got a nonce error and have a nonce to retry with
            if (json.error === 'use_dpop_nonce' && attempt < maxAttempts) {
                nonce = raw.headers.get('DPoP-Nonce');
                logging.debug(`[atproto-auth] Got DPoP-Nonce: ${nonce}, retrying PAR...`);
                continue;
            }

            // Not a retryable error, throw
            logging.error(`[atproto-auth] POST ${url} failed with ${raw.status}: ${JSON.stringify(json)}`);
            throw new BadRequestError({message: `Request to ${url} failed: ${json.error || raw.status}`});
        }

        throw new BadRequestError({message: `Request to ${url} failed after ${maxAttempts} attempts`});
    }

    async _postRaw(url, body, headers, timeoutMs = 5000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await fetch(url, {
                method: 'POST',
                headers,
                body,
                signal: controller.signal
            });
        } finally {
            clearTimeout(timer);
        }
    }

    /**
     * Find-or-create a Ghost member for the given DID and email.
     */
    async _upsertMember(did, email) {
        const membersApi = await this._getMembersApi();

        // 1. DID already linked to a member?
        const byDid = await membersApi.members.get({atproto_did: did});
        if (byDid) {
            if (byDid.get('email') !== email) {
                await membersApi.members.update({email}, {id: byDid.id});
                return await membersApi.members.get({id: byDid.id});
            }
            return byDid;
        }

        // 2. Email already belongs to a member?
        const byEmail = await membersApi.members.get({email});
        if (byEmail) {
            const existingDid = byEmail.get('atproto_did');
            if (existingDid && existingDid !== did) {
                throw new BadRequestError({message: 'This email already has a different ATProto identity linked'});
            }
            if (!existingDid) {
                await membersApi.members.update({atproto_did: did}, {id: byEmail.id});
            }
            return byEmail;
        }

        // 3. Create new member
        const newMember = await membersApi.members.create({
            email,
            atproto_did: did
        });
        return newMember;
    }

    /**
     * Validate that a redirect URL is same-origin as the Ghost site.
     * Returns null for invalid or missing values.
     */
    _sanitizeRedirectUrl(candidate) {
        if (!candidate || typeof candidate !== 'string') {
            return null;
        }
        try {
            const siteUrl = new URL(this._urlUtils.getSiteUrl());
            const candidateUrl = new URL(candidate);
            if (candidateUrl.origin !== siteUrl.origin) {
                return null;
            }
            return candidateUrl.href;
        } catch {
            return null;
        }
    }

    _callbackUrl() {
        let siteUrl = this._urlUtils.getSiteUrl().replace(/\/$/, '');
        // RFC 8252: OAuth for native apps requires loopback IPs, not hostnames
        siteUrl = siteUrl.replace('http://localhost:', 'http://127.0.0.1:').replace('https://localhost:', 'https://127.0.0.1:');
        return `${siteUrl}/members/atproto/callback`;
    }

    _clientMetadataUrl() {
        // Keep using the original hostname/port for client_id URL
        // (it needs to be fetchable by external Bluesky servers)
        // This may be localhost in dev or a public domain in production
        return `${this._urlUtils.getSiteUrl().replace(/\/$/, '')}/.well-known/oauth-client-metadata`;
    }

    /**
     * Returns the canonical callback URL for use in routes.
     */
    getCallbackUrl() {
        return this._callbackUrl();
    }

    /**
     * Returns the Ghost site URL.
     */
    getSiteUrl() {
        return this._urlUtils.getSiteUrl();
    }

    // Expose store for background cleanup
    get store() {
        return this._store;
    }
}

module.exports = AtprotoAuthService;
