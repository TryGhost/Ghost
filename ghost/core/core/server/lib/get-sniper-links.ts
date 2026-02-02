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

/**
 * Creates an [Android Chrome intent URL][0] which opens the a package by its ID
 * or hits an HTTP fallback.
 * [0]: https://developer.chrome.com/docs/android/intents
 */
const getAndroidIntentUrl = (packageName: string, fallbackUrl: string): string => (
    `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;launchFlags=0x10000000;package=${packageName};S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`
);

/**
 * Helper for building a URL with a single query parameter.
 */
const buildUrl = (baseHref: string, key: string, value: string): string => {
    const result = new URL(baseHref);
    result.searchParams.set(key, value);
    return result.toString();
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
        getAndroidLink: () => getAndroidIntentUrl('com.google.android.gm', 'https://mail.google.com/')
    },
    {
        domains: ['yahoo.com', 'myyahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.it', 'ymail.com', 'rocketmail.com'],
        getDesktopLink: ({sender}) => `https://mail.yahoo.com/d/search/keyword=from:${encodeURIComponent(sender)}`,
        getAndroidLink: () => getAndroidIntentUrl('com.yahoo.mobile.client.android.mail', 'https://mail.yahoo.com/')
    },
    {
        domains: ['outlook.com', 'live.com', 'live.de', 'hotmail.com', 'hotmail.co.uk', 'hotmail.de', 'msn.com', 'passport.com', 'passport.net'],
        getDesktopLink: ({recipient}) => buildUrl('https://outlook.live.com/mail/', 'login_hint', recipient),
        getAndroidLink: () => getAndroidIntentUrl('com.microsoft.office.outlook', 'https://outlook.live.com/')
    },
    {
        domains: ['proton.me', 'pm.me', 'protonmail.com', 'protonmail.ch'],
        getDesktopLink: ({sender}) => `https://mail.proton.me/u/0/all-mail#from=${encodeURIComponent(sender)}`,
        getAndroidLink: () => getAndroidIntentUrl('ch.protonmail.android', 'https://mail.proton.me/')
    },
    {
        domains: ['icloud.com', 'me.com', 'mac.com'],
        getDesktopLink: () => 'https://www.icloud.com/mail',
        getAndroidLink: () => 'https://www.icloud.com/mail'
    },
    {
        domains: ['hey.com'],
        getDesktopLink: () => 'https://app.hey.com/topics/everything',
        getAndroidLink: () => getAndroidIntentUrl('com.basecamp.hey', 'https://app.hey.com/')
    },
    {
        domains: ['aol.com'],
        getDesktopLink: ({sender}) => `https://mail.aol.com/d/search/keyword=from:${encodeURIComponent(sender)}`,
        getAndroidLink: () => getAndroidIntentUrl('com.aol.mobile.aolapp', 'https://mail.aol.com/')
    },
    {
        domains: ['mail.ru'],
        getDesktopLink: ({sender}) => buildUrl('https://e.mail.ru/search/', 'q_from', sender),
        getAndroidLink: () => getAndroidIntentUrl('ru.mail.mailapp', 'https://e.mail.ru/')
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
