import yaml from 'js-yaml';
import tpl from '@tryghost/tpl';
import * as errors from '@tryghost/errors';

import type {RedirectConfig} from './types';

const messages = {
    jsonParse: 'Could not parse JSON: {context}.',
    jsonInvalid: 'JSON input must be an array of redirect objects.',
    yamlParse: 'Could not parse YAML: {context}.',
    yamlInvalid: 'YAML input is invalid. Check the contents of your YAML file.',
    redirectsHelp: 'https://ghost.org/docs/themes/routing/#redirects'
};

export const parseJson = (content: string): RedirectConfig[] => {
    let parsed: unknown;
    try {
        parsed = JSON.parse(content);
    } catch (err) {
        throw new errors.BadRequestError({
            message: tpl(messages.jsonParse, {context: (err as Error).message})
        });
    }

    if (!Array.isArray(parsed)) {
        throw new errors.BadRequestError({
            message: tpl(messages.jsonInvalid),
            help: tpl(messages.redirectsHelp)
        });
    }

    return parsed as RedirectConfig[];
};

const isPlainMapping = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export const parseYaml = (content: string): RedirectConfig[] => {
    let configYaml: unknown;
    try {
        configYaml = yaml.load(content);
    } catch (err) {
        throw new errors.BadRequestError({
            message: tpl(messages.yamlParse, {context: (err as Error).message})
        });
    }

    // A list, scalar, or empty file would otherwise produce zero redirects
    // and silently wipe the live config via `replaceAll([])` on upload.
    if (!isPlainMapping(configYaml)) {
        throw new errors.BadRequestError({
            message: tpl(messages.yamlInvalid),
            help: tpl(messages.redirectsHelp)
        });
    }

    // Same silent-wipe risk for a mapping with no recognised section.
    if (!Object.hasOwn(configYaml, '301') && !Object.hasOwn(configYaml, '302')) {
        throw new errors.BadRequestError({
            message: tpl(messages.yamlInvalid),
            help: tpl(messages.redirectsHelp)
        });
    }

    const redirects: RedirectConfig[] = [];

    for (const statusCode of ['302', '301'] as const) {
        const section = configYaml[statusCode];
        // `301:` / `302:` with no entries parses as null — tolerated.
        if (section === undefined || section === null) {
            continue;
        }

        if (!isPlainMapping(section)) {
            throw new errors.BadRequestError({
                message: tpl(messages.yamlInvalid),
                help: tpl(messages.redirectsHelp)
            });
        }

        for (const from in section) {
            const to = section[from];
            // YAML coerces `: 123` to a number and `: ~` to null; reject
            // both here so the error points at the YAML rather than at
            // a coerced redirect entry downstream.
            if (typeof to !== 'string') {
                throw new errors.BadRequestError({
                    message: tpl(messages.yamlInvalid),
                    help: tpl(messages.redirectsHelp)
                });
            }
            redirects.push({from, to, permanent: statusCode === '301'});
        }
    }

    return redirects;
};

// Round-trips through parseYaml to []. Avoids a "download → save →
// re-upload throws on empty body" footgun on fresh installs.
const EMPTY_DOWNLOAD_TEMPLATE = '# See https://ghost.org/docs/themes/routing/#redirects\n301: {}\n302: {}\n';

export const serializeToYaml = (redirects: RedirectConfig[]): string => {
    const permanent: RedirectConfig[] = [];
    const temporary: RedirectConfig[] = [];

    for (const redirect of redirects) {
        if (redirect.permanent) {
            permanent.push(redirect);
        } else {
            temporary.push(redirect);
        }
    }

    const sections: string[] = [];

    if (permanent.length > 0) {
        sections.push(formatSection('301', permanent));
    }

    if (temporary.length > 0) {
        sections.push(formatSection('302', temporary));
    }

    if (sections.length === 0) {
        return EMPTY_DOWNLOAD_TEMPLATE;
    }

    return sections.join('\n');
};

// Section headers are emitted by hand because js-yaml quotes
// numeric-string keys (`"301":`), diverging from the unquoted form
// every existing redirects.yaml file ships with. Pairs go through
// js-yaml so block scalars and special-char escaping stay correct.
const formatSection = (statusCode: '301' | '302', redirects: RedirectConfig[]): string => {
    const lines = [`${statusCode}:`];
    for (const redirect of redirects) {
        const pair = yaml.dump({[redirect.from]: redirect.to});
        for (const line of pair.split('\n')) {
            if (line === '') {
                continue;
            }
            lines.push(`  ${line}`);
        }
    }
    return lines.join('\n') + '\n';
};
