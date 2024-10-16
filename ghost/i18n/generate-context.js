const fs = require('fs').promises;
const path = require('path');

const BASE_PATH = './locales/en';
const CONTEXT_FILE = './locales/context.json';

(async () => {
    const context = require(CONTEXT_FILE);
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

    await fs.writeFile(CONTEXT_FILE, JSON.stringify(orderedContext, null, 4));
})();
