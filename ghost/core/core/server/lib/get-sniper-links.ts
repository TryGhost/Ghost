/**
 * This module is heavily modified from [Buttondown's Sniper Link project][0].
 * Its license is copied below.
 *
 * [0]: https://github.com/buttondown/sniper-link
 *
 * MIT License
 *
 * Copyright (c) 2024 Buttondown
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import type {MxRecord} from 'node:dns';
import * as dns from 'node:dns/promises';
import {parseEmailAddress} from '@tryghost/parse-email-address';
import logging from '@tryghost/logging';

type GetLinkFn = (options: Readonly<{recipient: string; sender: string}>) => string;

type Provider = {
    domains: ReadonlyArray<string>;
    getDesktopLink: GetLinkFn;
    getAndroidLink: GetLinkFn;
};

const PROVIDERS: ReadonlyArray<Provider> = [
    {
        domains: ['gmail.com', 'googlemail.com', 'google.com'],
        getDesktopLink: ({recipient, sender}) => (
            `https://mail.google.com/mail/u/${encodeURIComponent(
                recipient
            )}/#search/from%3A(${encodeURIComponent(
                sender
            )})+in%3Aanywhere+newer_than%3A1h`
        ),
        getAndroidLink: () => (
            `intent://open/#Intent;scheme=googlegmail;package=com.google.android.gm;S.browser_fallback_url=https%3A%2F%2Fmail.google.com%2Fmail%2F;end`
        )
    }
];

const PROVIDER_BY_DOMAIN = new Map<string, Provider>();
for (const provider of PROVIDERS) {
    for (const domain of provider.domains) {
        PROVIDER_BY_DOMAIN.set(domain, provider);
    }
}

const getErrorCode = (err: unknown): undefined | string => (
    err && typeof err === 'object' && 'code' in err && typeof err.code === 'string'
        ? err.code
        : undefined
);

/**
 * Grab the MX records for a domain.
 *
 * If there are any errors at all, return the empty array. We don't want to
 * break sniper links if a DNS lookup fails—worst case, the user won't get a
 * "open in your email app" link.
 */
const getMxRecords = async (
    domain: string,
    dnsResolver: Pick<dns.Resolver, 'resolveMx'>
): Promise<MxRecord[]> => {
    try {
        return await dnsResolver.resolveMx(domain);
    } catch (err: unknown) {
        // This logs a warning, not an error, because most DNS errors could
        // happen normally. For example, a user could provide a bogus hostname.
        // There are some errors (like `dns.NOMEM`) which should probably use
        // `logging.error`, but it's not worth maintaining a long list of which
        // errors are which.
        logging.warn('Got error code when looking up MX record', getErrorCode(err));
        return [];
    }
};

/**
 * Given an MX record exchange, return the provider if found.
 *
 * `google.com` and `smtp.google.com` return the Google provider, for example.
 */
const getProviderForMxExchange = (exchange: string): undefined | Provider => {
    const direct = PROVIDER_BY_DOMAIN.get(exchange);
    if (direct) {
        return direct;
    }
    for (const [providerDomain, provider] of PROVIDER_BY_DOMAIN.entries()) {
        if (exchange.endsWith(`.${providerDomain}`)) {
            return provider;
        }
    }
};

/**
 * Get the first item in an iterable, like a Set.
 *
 * Like `_.head()`, but works with any iterable.
 */
const first = <T>(iterable: Iterable<T>): undefined | T => {
    for (const result of iterable) {
        return result;
    }
};

/**
 * Given a domain like `gmail.com`, return a provider object.
 *
 * If the domain is in our hard-coded list of providers, return that.
 *
 * Otherwise, resolve the domain's MX records. If found, find the exchange with
 * the best priority that has exactly one unique provider.
 */
const getProvider = async (
    domain: string,
    dnsResolver: Pick<dns.Resolver, 'resolveMx'>
): Promise<undefined | Provider> => {
    const hardcoded = PROVIDER_BY_DOMAIN.get(domain);
    if (hardcoded) {
        return hardcoded;
    }

    const mxRecords = await getMxRecords(domain, dnsResolver);

    let bestPriorityThatHasAProvider = Infinity;
    const providersByPriority = new Map<number, Set<undefined | Provider>>();

    for (const {priority, exchange} of mxRecords) {
        // We can skip these as an optimization.
        if (priority > bestPriorityThatHasAProvider) {
            continue;
        }

        const provider = getProviderForMxExchange(exchange);

        const providersWithThisPriority = providersByPriority.get(priority) ?? new Set();
        providersWithThisPriority.add(provider);
        providersByPriority.set(priority, providersWithThisPriority);

        if (provider) {
            bestPriorityThatHasAProvider = Math.min(bestPriorityThatHasAProvider, priority);
        }
    }

    const candidates = providersByPriority.get(bestPriorityThatHasAProvider);
    return candidates?.size === 1 ? first(candidates) : undefined;
};

/**
 * Given an email address, return "sniper links" to open the email app/inbox.
 *
 * For example, if `newsletter@sender.example` emails `test@gmail.com`, we want
 * a link to open Gmail.
 */
export const getSniperLinks = async (
    options: Readonly<{
        recipient: string;
        sender: string;
        dnsResolver: Pick<dns.Resolver, 'resolveMx'>
    }>
): Promise<undefined | {android: string; desktop: string}> => {
    const {recipient, dnsResolver} = options;

    const domain = parseEmailAddress(recipient)?.domain;
    if (!domain) {
        return;
    }

    const provider = await getProvider(domain, dnsResolver);
    if (!provider) {
        return;
    }

    return {
        android: provider.getAndroidLink(options),
        desktop: provider.getDesktopLink(options)
    };
};
