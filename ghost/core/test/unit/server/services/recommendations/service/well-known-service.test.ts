import assert from 'assert/strict';
import fs from 'fs/promises';
import path from 'path';
import {Recommendation, WellknownService} from '../../../../../../core/server/services/recommendations/service';

const dir = path.join(__dirname, 'data');

async function getContent() {
    const content = await fs.readFile(path.join(dir, '.well-known', 'recommendations.json'), 'utf8');
    return JSON.parse(content);
}

describe('WellknownService', function () {
    const service = new WellknownService({
        urlUtils: {
            relativeToAbsolute(url: string) {
                return 'https://example.com' + url;
            }
        },
        dir
    });

    afterEach(async function () {
        // Remove folder
        await fs.rm(dir, {recursive: true, force: true});
    });

    it('Can save recommendations', async function () {
        const recommendations = [
            Recommendation.create({
                title: 'My Blog',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com/blog',
                oneClickSubscribe: false,
                createdAt: new Date('2021-01-01T00:00:00Z'),
                updatedAt: new Date('2021-02-01T00:00:00Z')
            }),
            Recommendation.create({
                title: 'My Other Blog',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com/blog2',
                oneClickSubscribe: false,
                createdAt: new Date('2021-01-01T00:00:00Z'),
                updatedAt: null
            })
        ];

        await service.set(recommendations);

        // Check that the file exists
        assert.deepEqual(await getContent(), [
            {
                url: 'https://example.com/blog',
                created_at: '2021-01-01T00:00:00.000Z',
                updated_at: '2021-02-01T00:00:00.000Z'
            },
            {
                url: 'https://example.com/blog2',
                created_at: '2021-01-01T00:00:00.000Z',
                updated_at: '2021-01-01T00:00:00.000Z'
            }
        ]);
    });

    it('Can get URL', async function () {
        assert.equal(
            (await service.getURL()).toString(),
            'https://example.com/.well-known/recommendations.json'
        );
    });
});
