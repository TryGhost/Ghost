import {test, expect} from '../../helpers/playwright';
import {createTagFactory, type TagFactory} from '../../data-factory';
import {TagsPage} from '../../helpers/pages/admin';

test.describe('Ghost Admin - Tags', () => {
    let tagFactory: TagFactory;

    test.beforeEach(async ({page}) => {
        tagFactory = createTagFactory(page);
    });

    test('shows newly created tag in public tags list', async ({page}) => {
        await tagFactory.create({name: 'test new tag'});

        const tagsPage = new TagsPage(page);
        await tagsPage.goto();

        await expect(tagsPage.getTagByName('test new tag')).toBeVisible();
    });
});
