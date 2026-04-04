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
        console.error('context.json is out of date. Run `yarn translate` in ghost/i18n and commit the result.');
        process.exit(1);
    }

    await fs.writeFile(CONTEXT_FILE, newContent);
})();
