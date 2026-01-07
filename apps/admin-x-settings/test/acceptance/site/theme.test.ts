import {expect, test} from '@playwright/test';
import {globalDataRequests, limitRequests, mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Theme settings', async () => {
    test('Browsing and installing default themes', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            ...limitRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes},
            installTheme: {method: 'POST', path: /^\/themes\/install\/\?/, response: {
                themes: [{
                    name: 'edition',
                    package: {},
                    active: false,
                    templates: []
                }]
            }},
            activateTheme: {method: 'PUT', path: '/themes/casper/activate/', response: {
                themes: [{
                    ...responseFixtures.themes.themes.find(theme => theme.name === 'casper')!,
                    active: true
                }]
            }},
            activeTheme: {
                method: 'GET',
                path: '/themes/active/',
                response: {
                    themes: [{
                        name: 'edition',
                        package: {},
                        active: true,
                        templates: []
                    }]
                }
            }
        }});

        await page.goto('/');

        const themeSection = page.getByTestId('theme');

        // Edition is the active theme
        await expect(themeSection).toHaveText(/edition/i);

        await themeSection.getByRole('button', {name: 'Change theme'}).click();

        const modal = page.getByTestId('theme-modal');

        // 1. Activate Casper (Edition is currently active)
        await modal.getByRole('button', {name: /Casper/}).click();
        await expect(modal.getByRole('button', {name: 'Activate Casper'})).toBeVisible();

        await modal.getByRole('button', {name: 'Activate Casper'}).click();
        await expect(page.getByTestId('confirmation-modal')).toHaveText(/activate/);
        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Activate'}).click();
        await expect(page.getByTestId('toast-success')).toHaveText(/casper is now your active theme/);

        // 2. Go back to themes list
        await modal.getByRole('button', {name: 'Change theme'}).click();

        // 3. Try to update Edition (which is already installed, should trigger overwrite)
        await modal.getByRole('button', {name: /Edition/}).click();
        await modal.getByRole('button', {name: 'Update Edition'}).click();

        // Should show overwrite confirmation
        const overwriteModal = page.getByTestId('confirmation-modal');
        await expect(overwriteModal).toBeVisible();
        await expect(overwriteModal).toHaveText(/overwrite/i);

        // Test Cancel button behavior
        await overwriteModal.getByRole('button', {name: 'Cancel'}).click();

        // Verify the overwrite modal is closed
        await expect(overwriteModal).not.toBeVisible();

        // Verify the theme modal is still open
        await expect(modal).toBeVisible();

        // Verify we're still on the Edition theme preview
        await expect(modal).toHaveText(/Edition/);
        await expect(modal.getByRole('button', {name: 'Update Edition'})).toBeVisible();

        // Install Edition again and overwrite it
        await modal.getByRole('button', {name: 'Update Edition'}).click();
        await overwriteModal.getByRole('button', {name: 'Overwrite'}).click();

        // Verify that Casper activation was called
        expect(lastApiRequests.activateTheme?.url).toMatch(/\/themes\/casper\/activate/);
        expect(lastApiRequests.installTheme?.url).toMatch(/\?source=github&ref=TryGhost%2FEdition/);
    });

    test('Managing installed themes', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes},
            activateTheme: {method: 'PUT', path: '/themes/casper/activate/', response: {
                themes: [{
                    ...responseFixtures.themes.themes.find(theme => theme.name === 'casper')!,
                    active: true
                }]
            }},
            deleteTheme: {method: 'DELETE', path: '/themes/edition/', response: {}}
        }});

        await page.goto('/');

        const themeSection = page.getByTestId('theme');

        await themeSection.getByRole('button', {name: 'Change theme'}).click();

        const modal = page.getByTestId('theme-modal');

        await modal.getByRole('tab', {name: 'Installed'}).click();

        await expect(modal.getByTestId('theme-list-item')).toHaveCount(2);

        const casper = modal.getByTestId('theme-list-item').filter({hasText: /casper/});
        const edition = modal.getByTestId('theme-list-item').filter({hasText: /edition/});

        // Activate the inactive theme

        await expect(casper.getByRole('button', {name: 'Activate'})).toBeVisible();
        await expect(edition).toHaveText(/Active/);

        await casper.getByRole('button', {name: 'Activate'}).click();

        await expect(casper).toHaveText(/Active/);
        await expect(edition.getByRole('button', {name: 'Activate'})).toBeVisible();

        expect(lastApiRequests.activateTheme?.url).toMatch(/\/themes\/casper\/activate\//);

        // Download the active theme

        await casper.getByRole('button', {name: 'Menu'}).click();
        await page.getByTestId('popover-content').getByRole('button', {name: 'Download'}).click();

        await expect(page.locator('iframe#iframeDownload')).toHaveAttribute('src', /\/api\/admin\/themes\/casper\/download/);

        // Delete the inactive theme

        await edition.getByRole('button', {name: 'Menu'}).click();
        await page.getByTestId('popover-content').getByRole('button', {name: 'Delete'}).click();

        const confirmation = page.getByTestId('confirmation-modal');
        await confirmation.getByRole('button', {name: 'Delete'}).click();

        await expect(modal.getByTestId('theme-list-item')).toHaveCount(1);

        expect(lastApiRequests.deleteTheme?.url).toMatch(/\/themes\/edition\/$/);
    });

    test('Uploading a new theme', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes},
            uploadTheme: {method: 'POST', path: '/themes/upload/', response: {
                themes: [{
                    name: 'mytheme',
                    package: {},
                    active: false,
                    templates: []
                }]
            }}
        }});

        await page.goto('/');

        const themeSection = page.getByTestId('theme');

        await themeSection.getByRole('button', {name: 'Change theme'}).click();

        const modal = page.getByTestId('theme-modal');

        await modal.getByRole('button', {name: 'Upload theme'}).click();

        const fileChooserPromise = page.waitForEvent('filechooser');

        await page.getByTestId('confirmation-modal').locator('label[for=theme-upload]').click();

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(`${__dirname}/../../utils/responses/theme.zip`);

        await expect(page.getByTestId('confirmation-modal')).toHaveText(/successful/);

        await expect(modal.getByTestId('theme-list-item')).toHaveCount(3);

        expect(lastApiRequests.uploadTheme).toBeTruthy();
    });

    test('Limits uploading new themes and redirect to /pro', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...limitRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes},
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        hostSettings: {
                            limits: {
                                customThemes: {
                                    allowlist: ['casper', 'source', 'edition'],
                                    error: 'Upgrade to enable custom themes'
                                }
                            }
                        }
                    }
                }
            }
        }});

        await page.goto('/');

        const themeSection = page.getByTestId('theme');

        await themeSection.getByRole('button', {name: 'Change theme'}).click();

        const modal = page.getByTestId('theme-modal');

        await modal.getByRole('button', {name: 'Upload theme'}).click();

        // Wait for limit modal to appear
        await page.waitForSelector('[data-testid="limit-modal"]', {timeout: 10000});

        await expect(page.getByTestId('limit-modal')).toHaveText(/Upgrade to enable custom themes/);

        const limitModal = page.getByTestId('limit-modal');

        await limitModal.getByRole('button', {name: 'Upgrade'}).click();

        // The route should be updated
        const newPageUrl = page.url();
        const newPageUrlObject = new URL(newPageUrl);
        const decodedUrl = decodeURIComponent(newPageUrlObject.pathname);

        // expect the route to be updated to /pro
        expect(decodedUrl).toMatch(/\/\{\"route\":\"\/pro\",\"isExternal\":true\}$/);
    });

    test('Prevents overwriting the default theme', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes},
            uploadTheme: {method: 'POST', path: '/themes/upload/', response: {
                themes: [{
                    name: 'mytheme',
                    package: {},
                    active: false,
                    templates: []
                }]
            }}
        }});

        await page.goto('/');

        const themeSection = page.getByTestId('theme');

        await themeSection.getByRole('button', {name: 'Change theme'}).click();

        const modal = page.getByTestId('theme-modal');

        await modal.getByRole('button', {name: 'Upload theme'}).click();

        const fileChooserPromise = page.waitForEvent('filechooser');

        await page.getByTestId('confirmation-modal').locator('label[for=theme-upload]').click();

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(`${__dirname}/../../utils/responses/source.zip`);

        await expect(page.getByTestId('confirmation-modal')).toHaveText(/Upload failed/);
    });

    test('fires Install Theme modal when redirected from marketplace url', async ({page}) => {
        // Positive test: Taste is in the allowlist
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...limitRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes},
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        hostSettings: {
                            limits: {
                                customThemes: {
                                    allowlist: ['casper', 'headline', 'taste'], // Taste IS in the allowlist
                                    error: 'Upgrade to use more themes'
                                }
                            }
                        }
                    }
                }
            }
        }});
        await page.goto('/#/settings/theme/install?source=github&ref=TryGhost/Taste');

        await page.waitForSelector('[data-testid="theme-modal"]');

        const confirmation = page.getByTestId('confirmation-modal');

        await expect(confirmation).toHaveText(/Install Theme/);
        await expect(confirmation).toHaveText(/By clicking below, Taste will automatically be activated as the theme for your site/);
    });

    test('Prevents changing theme when only one theme is allowed', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...limitRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes},
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        hostSettings: {
                            limits: {
                                customThemes: {
                                    allowlist: ['one-theme-only'],
                                    error: 'Upgrade to use custom themes'
                                }
                            }
                        }
                    }
                }
            }
        }});

        await page.goto('/');

        const themeSection = page.getByTestId('theme');

        // Wait for the theme section to be ready
        await expect(themeSection).toBeVisible();

        // Wait for the Change theme button to be ready (component needs to check limits first)
        const changeThemeButton = themeSection.getByRole('button', {name: 'Change theme'});
        await expect(changeThemeButton).toBeVisible();
        await expect(changeThemeButton).toBeEnabled();

        await changeThemeButton.click();

        // Should show limit modal instead of theme modal
        // Wait for the limit modal to appear (async limit check needs time)
        await page.waitForSelector('[data-testid="limit-modal"]', {timeout: 10000});

        await expect(page.getByTestId('limit-modal')).toBeVisible();
        await expect(page.getByTestId('limit-modal')).toHaveText(/Upgrade to use custom themes/);

        // Theme modal should not be visible
        await expect(page.getByTestId('theme-modal')).not.toBeVisible();

        const limitModal = page.getByTestId('limit-modal');
        await limitModal.getByRole('button', {name: 'Upgrade'}).click();

        // The route should be updated to /pro
        const newPageUrl = page.url();
        const newPageUrlObject = new URL(newPageUrl);
        const decodedUrl = decodeURIComponent(newPageUrlObject.pathname);

        expect(decodedUrl).toMatch(/\/\{"route":"\/pro","isExternal":true\}$/);
    });

    test('Allows changing theme when multiple themes are allowed', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...limitRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes},
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        hostSettings: {
                            limits: {
                                customThemes: {
                                    allowlist: ['casper', 'headline', 'edition'],
                                    error: 'Upgrade to use more themes'
                                }
                            }
                        }
                    }
                }
            }
        }});

        await page.goto('/');

        const themeSection = page.getByTestId('theme');

        await themeSection.getByRole('button', {name: 'Change theme'}).click();

        // Should show theme modal, not limit modal
        await expect(page.getByTestId('theme-modal')).toBeVisible();
        await expect(page.getByTestId('limit-modal')).not.toBeVisible();

        // Can interact with themes normally
        await expect(page.getByTestId('theme-modal').getByRole('button', {name: /Casper/})).toBeVisible();
    });

    test('Prevents direct access to design/change-theme route when limited', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...limitRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes},
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        hostSettings: {
                            limits: {
                                customThemes: {
                                    allowlist: ['casper'],
                                    error: 'Upgrade to use custom themes'
                                }
                            }
                        }
                    }
                }
            }
        }});

        // Navigate directly to the change theme route
        await page.goto('/#/settings/design/change-theme');

        // Should show limit modal instead of theme modal
        // Wait for the limit modal to appear (async limit check needs time)
        await page.waitForSelector('[data-testid="limit-modal"]', {timeout: 10000});

        await expect(page.getByTestId('limit-modal')).toBeVisible();
        await expect(page.getByTestId('limit-modal')).toHaveText(/Upgrade to use custom themes/);

        // Theme modal should not be visible
        await expect(page.getByTestId('theme-modal')).not.toBeVisible();
    });

    test('Theme install route works without limits', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...limitRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes},
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        hostSettings: {
                            limits: {
                                staff: {
                                    max: 10,
                                    error: 'You have reached the maximum number of staff users'
                                }
                                // No customThemes limit
                            }
                        }
                    }
                }
            },
            installTheme: {method: 'POST', path: /^\/themes\/install\/\?/, response: {
                themes: [{
                    name: 'taste',
                    package: {},
                    active: false,
                    templates: []
                }]
            }},
            activateTheme: {method: 'PUT', path: '/themes/taste/activate/', response: {
                themes: [{
                    name: 'taste',
                    package: {},
                    active: true,
                    templates: []
                }]
            }}
        }});

        await page.goto('/#/settings/theme/install?source=github&ref=TryGhost/Taste');

        await page.waitForSelector('[data-testid="theme-modal"]');

        const confirmation = page.getByTestId('confirmation-modal');

        await expect(confirmation).toHaveText(/Install Theme/);
        await expect(confirmation).toHaveText(/By clicking below, Taste will automatically be activated as the theme for your site/);

        // Can proceed with installation
        const installButton = confirmation.getByRole('button', {name: 'Install'});
        await expect(installButton).toBeVisible();
        await expect(installButton).toBeEnabled();

        await installButton.click();

        // Wait for the confirmation modal to close
        await expect(confirmation).not.toBeVisible();

        await expect(page.getByTestId('toast-success')).toHaveText(/taste is now your active theme/);
    });

    test('Theme install route allows installation when theme is in allowlist', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...limitRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes},
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        hostSettings: {
                            limits: {
                                customThemes: {
                                    allowlist: ['casper', 'headline', 'taste'],
                                    error: 'Upgrade to use more themes'
                                }
                            }
                        }
                    }
                }
            },
            installTheme: {method: 'POST', path: /^\/themes\/install\/\?/, response: {
                themes: [{
                    name: 'taste',
                    package: {},
                    active: false,
                    templates: []
                }]
            }},
            activateTheme: {method: 'PUT', path: '/themes/taste/activate/', response: {
                themes: [{
                    name: 'taste',
                    package: {},
                    active: true,
                    templates: []
                }]
            }}
        }});

        await page.goto('/#/settings/theme/install?source=github&ref=TryGhost/Taste');

        await page.waitForSelector('[data-testid="theme-modal"]');

        const confirmation = page.getByTestId('confirmation-modal');

        await expect(confirmation).toHaveText(/Install Theme/);
        await expect(confirmation).toHaveText(/By clicking below, Taste will automatically be activated as the theme for your site/);

        // Can proceed with installation because 'taste' is in the allowlist
        await confirmation.getByRole('button', {name: 'Install'}).click();
        await expect(page.getByTestId('toast-success')).toHaveText(/taste is now your active theme/);
    });

    test('Theme install route blocks installation, but shows change theme modal when theme is NOT in allowlist', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...limitRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes},
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        hostSettings: {
                            limits: {
                                customThemes: {
                                    allowlist: ['casper', 'headline', 'edition'], // 'taste' is NOT in the allowlist
                                    error: 'Upgrade to use more themes'
                                }
                            }
                        }
                    }
                }
            }
        }});

        await page.goto('/#/settings/theme/install?source=github&ref=TryGhost/Taste');

        // Should be redirected to /theme (not change-theme to avoid modal conflicts)
        await expect(page).toHaveURL(/#\/settings\/theme/);

        // Should show limit modal because 'taste' is not in the allowlist
        await expect(page.getByTestId('limit-modal')).toBeVisible();
        await expect(page.getByTestId('limit-modal')).toHaveText(/Upgrade to use more themes/);

        // Theme modal should NOT be visible
        await expect(page.getByTestId('theme-modal')).not.toBeVisible();
        await expect(page.getByTestId('confirmation-modal')).not.toBeVisible();

        // Close the limit modal
        await page.getByTestId('limit-modal').getByRole('button', {name: 'Cancel'}).click();

        // Should stay on /theme
        await expect(page).toHaveURL(/#\/settings\/theme/);
    });

    test('Theme install route blocks installation with single-theme allowlist', async ({page}) => {
        // When allowlist has only one theme, user shouldn't access theme modal at all
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...limitRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes},
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        hostSettings: {
                            limits: {
                                customThemes: {
                                    allowlist: ['casper'], // Only one theme allowed
                                    error: 'Upgrade to use custom themes'
                                }
                            }
                        }
                    }
                }
            }
        }});

        await page.goto('/#/settings/theme/install?source=github&ref=TryGhost/Taste');

        // Should show limit modal immediately
        await expect(page.getByTestId('limit-modal')).toBeVisible();
        await expect(page.getByTestId('limit-modal')).toHaveText(/Upgrade to use custom themes/);

        // Should be redirected to /theme (not change-theme)
        await expect(page).toHaveURL(/#\/settings\/theme/);

        // Theme modal should not be visible at all
        await expect(page.getByTestId('theme-modal')).not.toBeVisible();
        await expect(page.getByTestId('confirmation-modal')).not.toBeVisible();
    });

    test('Prevents installing themes not in allowlist via UI', async ({page}) => {
        // Test the UI flow: clicking on a theme and trying to install when it's not in the allowlist
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...limitRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes},
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        hostSettings: {
                            limits: {
                                customThemes: {
                                    allowlist: ['casper', 'edition'], // Headline is NOT in the allowlist
                                    error: 'Upgrade to use more themes'
                                }
                            }
                        }
                    }
                }
            }
        }});

        await page.goto('/');

        const themeSection = page.getByTestId('theme');
        await themeSection.getByRole('button', {name: 'Change theme'}).click();

        const modal = page.getByTestId('theme-modal');

        // Try to install a theme that's not in the allowlist
        await modal.getByRole('button', {name: /Headline/}).click();

        // Clicking install should show the limit modal
        await modal.getByRole('button', {name: 'Install Headline'}).click();

        // Should show limit modal instead of installation confirmation
        await expect(page.getByTestId('limit-modal')).toBeVisible();
        await expect(page.getByTestId('limit-modal')).toHaveText(/Upgrade to use more themes/);

        // Installation confirmation should not be visible
        await expect(page.getByTestId('confirmation-modal')).not.toBeVisible();
    });

    test('Shows limit modal before overwrite confirmation for already installed themes', async ({page}) => {
        // Test case: User has Edition theme installed (from fixtures), tries to update it when it's not in the allowlist
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...limitRequests,
            browseThemes: {method: 'GET', path: '/themes/', response: responseFixtures.themes},
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        hostSettings: {
                            limits: {
                                customThemes: {
                                    allowlist: ['casper', 'headline'], // Edition is NOT in the allowlist
                                    error: 'Upgrade to use more themes'
                                }
                            }
                        }
                    }
                }
            }
        }});

        await page.goto('/');

        const themeSection = page.getByTestId('theme');
        await themeSection.getByRole('button', {name: 'Change theme'}).click();

        const modal = page.getByTestId('theme-modal');

        // Wait for modal to be ready
        await expect(modal).toBeVisible();

        await modal.getByRole('button', {name: /Edition/}).click();

        // Wait for the theme preview to load
        await expect(modal).toContainText('Edition');

        // Edition is already installed, so the button should say "Update Edition"
        // and would normally trigger the overwrite confirmation modal, but because
        // we have a limit now that doesn't allow this theme, it should show the limit modal instead.
        const installButton = modal.getByRole('button', {name: 'Update Edition'});
        await expect(installButton).toBeVisible();

        // Click the install/update button
        await installButton.click();

        // Should show limit modal FIRST, not the overwrite confirmation
        await expect(page.getByTestId('limit-modal')).toBeVisible();
        await expect(page.getByTestId('limit-modal')).toHaveText(/Upgrade to use more themes/);

        // Overwrite confirmation should NOT be visible
        await expect(page.getByTestId('confirmation-modal').filter({hasText: /overwrite/i})).not.toBeVisible();
    });
});
