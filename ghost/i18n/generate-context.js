const fs = require('fs').promises;
const path = require('path');

const BASE_PATH = './locales/en';
const CONTEXT_FILE = './locales/context.json';

(async () => {
    const existingContent = await fs.readFile(CONTEXT_FILE, 'utf-8');
    const context = JSON.parse(existingContent);

    const newContext = {};

    const files = await fs.readdir(BASE_PATH);

    for (const file of files) {
        const filePath = path.join(process.cwd(), BASE_PATH, file);
        const data = require(filePath);

        for (const key of Object.keys(data)) {
            newContext[key] = context[key] || '';
        }
    }

    const orderedContext = Object.keys(newContext).sort().reduce((obj, key) => {
        obj[key] = newContext[key];
        return obj;
    }, {});

    const newContent = JSON.stringify(orderedContext, null, 4);

    if (process.env.CI && newContent !== existingContent) {
        // eslint-disable-next-line no-console
        console.error('context.json is out of date. Run `pnpm translate` in ghost/i18n and commit the result.');
        process.exit(1);
    }

    const emptyKeys = Object.keys(orderedContext).filter((key) => {
        const value = orderedContext[key] ?? '';
        return value.trim() === '';
    });

    if (emptyKeys.length > 0) {
        if (process.env.CI) {
            const keyList = emptyKeys.map(k => '  - "' + k + '"').join('\n');
            // eslint-disable-next-line no-console
            console.error('Translation keys are missing context descriptions in context.json:\n' + keyList);
            // eslint-disable-next-line no-console
            console.error('\nAdd a description for each key in locales/context.json to help translators understand where and how the string is used.');
            process.exit(1);
        } else {
            // eslint-disable-next-line no-console
            console.warn(`Warning: ${emptyKeys.length} key(s) in context.json have empty descriptions. Please add context before committing.`);
        }
    }

    await fs.writeFile(CONTEXT_FILE, newContent);
})();
