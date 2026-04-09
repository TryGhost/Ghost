import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Transistor integration settings', async () => {
    test('Disabled by configured limitations', async ({page}) => {
        await mockApi({page, requests: {...globalDataRequests, browseConfig: {
            ...globalDataRequests.browseConfig,
            response: {
                config: {
                    ...responseFixtures.config.config,
                    hostSettings: {
                        limits: {
                            customIntegrations: {
                                disabled: true
                            }
                        }
                    }
                }
            }
        }}});

        await page.goto('/');

        const integrationsSection = page.getByTestId('integrations');

        await integrationsSection.getByTestId('transistor-integration').hover();
        await expect(integrationsSection.getByTestId('transistor-integration').getByRole('button', {name: 'Upgrade'})).toHaveCount(1);
    });

    test('Disabled integrations sort to the bottom while keeping their relative order', async ({page}) => {
        await mockApi({page, requests: {...globalDataRequests, browseConfig: {
            ...globalDataRequests.browseConfig,
            response: {
                config: {
                    ...responseFixtures.config.config,
                    hostSettings: {
                        limits: {
                            customIntegrations: {
                                disabled: true
                            }
                        }
                    }
                }
            }
        }}});

        await page.goto('/');

        const integrationsSection = page.getByTestId('integrations');
        const integrationOrder = await integrationsSection.locator([
            '[data-testid="zapier-integration"]',
            '[data-testid="slack-integration"]',
            '[data-testid="unsplash-integration"]',
            '[data-testid="firstpromoter-integration"]',
            '[data-testid="pintura-integration"]',
            '[data-testid="transistor-integration"]',
            '[data-testid="content-api-integration"]'
        ].join(', ')).evaluateAll(elements => elements.map(element => element.getAttribute('data-testid')));

        expect(integrationOrder).toEqual([
            'slack-integration',
            'unsplash-integration',
            'firstpromoter-integration',
            'pintura-integration',
            'content-api-integration',
            'zapier-integration',
            'transistor-integration'
        ]);
    });
});
