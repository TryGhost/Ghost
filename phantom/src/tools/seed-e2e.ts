import {resolve} from 'node:path';
import {createDb} from '../db/client.js';
import {ensureCoreSchema} from '../db/ddl.js';
import {loadConfig} from '../platform/config/config.js';
import {seedFromFixture} from '../modules/operations/e2e-seed.js';

const run = async () => {
    const config = loadConfig();
    const db = createDb(config.db);
    await ensureCoreSchema(db);

    const fixturePath = resolve(process.cwd(), 'test', 'fixtures', 'ghost-v5-export.json');
    const counts = await seedFromFixture(db, fixturePath);
    console.info('Seeded e2e database', {db: config.db.url, posts: counts.posts, tags: counts.tags});
};

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
