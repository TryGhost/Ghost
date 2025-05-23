/**
 * Test utilities for admin-x-framework
 * 
 * This file exports all testing utilities based on MSW (Mock Service Worker)
 */

// Re-export everything from msw.ts for easy access
export * from './test/msw';

// Export Playwright-specific utilities
export {
    mockApi,
    playwrightServer
} from './test/msw-playwright';

// Also export auxiliary test utilities from acceptance
export {
    mockSitePreview,
    chooseOptionInSelect,
    getOptionsFromSelect,
    testUrlValidation,
    expectExternalNavigate
} from './test/acceptance'; 