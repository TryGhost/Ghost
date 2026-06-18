import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createDb} from '../db/client.js';
import {ensureCoreSchema} from '../db/ddl.js';
import {loadConfig} from '../platform/config/config.js';
import {createGhostImporter} from '../modules/operations/importer.js';

const parseInputPath = () => {
    const args = process.argv.slice(2);
    const inputIndex = args.findIndex((arg) => arg === '--input');
    const input = inputIndex === -1 ? null : args[inputIndex + 1];
    if (!input) {
        throw new Error('Missing --input path to Ghost export JSON');
    }
    return resolve(process.cwd(), input);
};

const run = async () => {
    const inputPath = parseInputPath();
    const raw = await readFile(inputPath, 'utf-8');
    const exportData = JSON.parse(raw) as unknown;

    const config = loadConfig();
    const db = createDb(config.db);
    await ensureCoreSchema(db);

    const importer = createGhostImporter(db);
    const counts = await importer.importExport(exportData);

    console.info('Migration complete');
    console.info(counts);
};

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
