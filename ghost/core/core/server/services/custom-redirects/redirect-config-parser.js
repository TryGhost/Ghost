const yaml = require('js-yaml');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    jsonParse: 'Could not parse JSON: {context}.',
    jsonInvalid: 'JSON input must be an array of redirect objects.',
    yamlParse: 'Could not parse YAML: {context}.',
    yamlInvalid: 'YAML input is invalid. Check the contents of your YAML file.',
    redirectsHelp: 'https://ghost.org/docs/themes/routing/#redirects'
};

/**
 * @param {string} content - JSON-serialised RedirectConfig[]
 * @returns {import('./types').RedirectConfig[]}
 */
const parseJson = (content) => {
    let parsed;
    try {
        parsed = JSON.parse(content);
    } catch (err) {
        throw new errors.BadRequestError({
            message: tpl(messages.jsonParse, {context: err.message})
        });
    }

    if (!Array.isArray(parsed)) {
        throw new errors.BadRequestError({
            message: tpl(messages.jsonInvalid),
            help: tpl(messages.redirectsHelp)
        });
    }

    return parsed;
};

const isPlainMapping = value => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * @param {string} content - YAML with `301:` and/or `302:` mapping sections
 * @returns {import('./types').RedirectConfig[]}
 */
const parseYaml = (content) => {
    let configYaml;
    try {
        configYaml = yaml.load(content);
    } catch (err) {
        throw new errors.BadRequestError({
            message: tpl(messages.yamlParse, {context: err.message})
        });
    }

    // Top-level must be a mapping with `301:` / `302:` keys. A YAML list
    // (`- /a: /b`) or scalar would otherwise iterate over indices and
    // silently produce zero redirects, which `replaceAll([])` would
    // then accept as a wipe. An empty file (`yaml.load('') === undefined`)
    // also lands here and rejects — preserves the legacy behaviour where
    // an unparseable / empty redirects file surfaced as a logged error
    // at boot rather than a silent wipe at upload.
    if (!isPlainMapping(configYaml)) {
        throw new errors.BadRequestError({
            message: tpl(messages.yamlInvalid),
            help: tpl(messages.redirectsHelp)
        });
    }

    // The mapping must contain at least one of the recognised status
    // sections. `foo: bar` is technically a plain mapping but contains
    // no redirects — without this guard it would parse to `[]` and on
    // upload silently wipe the live config via `replaceAll([])`.
    if (!Object.hasOwn(configYaml, '301') && !Object.hasOwn(configYaml, '302')) {
        throw new errors.BadRequestError({
            message: tpl(messages.yamlInvalid),
            help: tpl(messages.redirectsHelp)
        });
    }

    const redirects = [];

    for (const statusCode of ['302', '301']) {
        const section = configYaml[statusCode];
        // Empty `301:` / `302:` headers parse as `null`. Tolerate them
        // — self-hosters' hand-edited files commonly have a stub
        // section they fill in later.
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
            // YAML happily parses `: 123` as an integer or `: ~` as
            // null. The downstream validator would still reject these,
            // but rejecting in the parser surfaces an error message
            // that points at the offending YAML structure rather than
            // a coerced redirect entry.
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

const EMPTY_DOWNLOAD_TEMPLATE = '# See https://ghost.org/docs/themes/routing/#redirects\n301: {}\n302: {}\n';

/**
 * Serialises redirects into the canonical YAML download format.
 *
 * Output groups by status code with 301s first, then 302s. Relative
 * order within each group is preserved. Cross-group order is lost
 * because the YAML representation requires the grouping — this is the
 * same shape every YAML user's existing file already has.
 *
 * The section headers (`301:` / `302:`) are emitted by hand because
 * js-yaml quotes numeric-string keys to disambiguate them from
 * integers (`"301":`), which would diverge from the unquoted form
 * Ghost has shipped for years. Each `from: to` pair underneath is
 * dumped via js-yaml so escaping, block scalars, and quoting of
 * special characters in the redirect fields are handled correctly.
 *
 * @param {import('./types').RedirectConfig[]} redirects
 * @returns {string} a YAML document
 */
const serializeToYaml = (redirects) => {
    const permanent = [];
    const temporary = [];

    for (const redirect of redirects) {
        if (redirect.permanent) {
            permanent.push(redirect);
        } else {
            temporary.push(redirect);
        }
    }

    const sections = [];

    if (permanent.length > 0) {
        sections.push(formatSection('301', permanent));
    }

    if (temporary.length > 0) {
        sections.push(formatSection('302', temporary));
    }

    if (sections.length === 0) {
        // Self-documenting starting template instead of an empty body.
        // Round-trips through parseYaml back to [], so a self-hoster
        // download → save → re-upload loop on a fresh install behaves
        // identically to one with an existing config.
        return EMPTY_DOWNLOAD_TEMPLATE;
    }

    return sections.join('\n');
};

const formatSection = (statusCode, redirects) => {
    const lines = [`${statusCode}:`];
    for (const redirect of redirects) {
        // js-yaml emits a complete `key: value` mapping including any
        // necessary quoting and block-scalar formatting for both the
        // key and the value. Indenting the result by two spaces nests
        // it correctly under the section header. Concatenating
        // `yaml.dump(key).trim() + ': ' + yaml.dump(value).trim()` by
        // hand would mangle multi-line values (block scalars need
        // their content indented relative to the key).
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

module.exports = {
    parseJson,
    parseYaml,
    serializeToYaml
};
