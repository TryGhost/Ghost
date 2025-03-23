import {MockedApi, initialize} from '../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Labs', async () => {
    test('Can toggle content based on Lab settings', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            labs: {
                testFlag: true
            }
        });

        await expect(frame.getByTestId('this-comes-from-a-flag')).toHaveCount(1);
    });

    test('test div is hidden if flag is not set', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            labs: {
                testFlag: false
            }
        });

        await expect(frame.getByTestId('this-comes-from-a-flag')).not.toBeVisible();
    });
});