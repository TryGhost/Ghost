# Migration Plan: Switching from Manual Fixtures to Mirage JS

## Overview

This document outlines the migration from the current awkward test fixtures and API mocking setup to a modern Mirage JS implementation for the Ghost Portal application.

## Current State Analysis

**Problematic Areas Identified:**
- **Manual Jest Mocking**: Complex setup functions like `offerSetup()`, `setup()`, and `multiTierSetup()` with repetitive Jest mocks
- **Static Fixture Data**: Large fixture files (`test-fixtures.js`, `fixtures.js`) with hardcoded data structures
- **API Mocking Complexity**: Manual `jest.fn()` mocks for each API endpoint in every test
- **Test Maintenance**: Duplicated setup code across 30+ test files
- **Poor Developer Experience**: Difficult to create new test scenarios or modify existing data

## Migration Strategy

### Phase 1: Foundation Setup (Week 1)
**Goal**: Install Mirage JS and create core server configuration

1. **Install Dependencies**
   ```bash
   npm install --save-dev miragejs
   ```

2. **Create Core Server Configuration**
   ```javascript
   // src/mirage/server.js
   import { createServer, Model, Factory, belongsTo, hasMany } from 'miragejs'

   export function makeServer({ environment = 'test' } = {}) {
     return createServer({
       environment,

       models: {
         site: Model,
         member: Model,
         product: Model.extend({
           monthlyPrice: belongsTo('price'),
           yearlyPrice: belongsTo('price'),
         }),
         price: Model,
         subscription: Model,
         offer: Model,
         newsletter: Model,
       },

       factories: {
         // Will be defined in Phase 2
       },

       routes() {
         this.namespace = '/members/api'

         // Site endpoints
         this.get('/site', (schema) => schema.sites.first())
         this.get('/member', (schema) => schema.members.first())

         // Member actions
         this.post('/send-magic-link', () => 'Success')
         this.post('/create-stripe-checkout-session', () => ({}))
         this.get('/integrity-token', () => 'testtoken')
       }
     })
   }
   ```

3. **Update Vite Configuration**
   ```javascript
   // vite.config.js - add to test configuration
   test: {
     globals: true,
     environment: 'jsdom',
     setupFiles: ['./src/setupTests.js', './src/mirage/test-setup.js'],
     testTimeout: 10000
   }
   ```

### Phase 2: Data Modeling & Factories (Week 2)
**Goal**: Replace static fixtures with dynamic Mirage factories

1. **Create Factories**
   ```javascript
   // src/mirage/factories.js
   import { Factory, trait } from 'miragejs'

   export const siteFactory = Factory.extend({
     title: 'The Blueprint',
     description: 'Thoughts, stories and ideas.',
     logo: 'https://static.ghost.org/v4.0.0/images/ghost-orb-1.png',
     accent_color: '#45C32E',
     url: 'https://portal.localhost',
     portal_button: true,
     portal_name: true,
     portal_plans: ['free', 'monthly', 'yearly'],
     members_signup_access: 'all',

     singleTier: trait({
       // Single tier configuration
     }),

     multipleTiers: trait({
       // Multiple tiers configuration
     })
   })

   export const memberFactory = Factory.extend({
     name: 'Jamie Larson',
     email: 'jamie@example.com',
     paid: false,
     subscribed: true,

     free: trait({
       paid: false,
       subscriptions: []
     }),

     paid: trait({
       paid: true,
       subscriptions: () => [/* subscription data */]
     })
   })
   ```

2. **Create Test Helpers**
   ```javascript
   // src/mirage/test-helpers.js
   export function createSingleTierSite(server) {
     const site = server.create('site', 'singleTier')
     const freeProduct = server.create('product', { type: 'free' })
     const paidProduct = server.create('product', { type: 'paid' })
     return { site, products: [freeProduct, paidProduct] }
   }

   export function createMultiTierSite(server) {
     const site = server.create('site', 'multipleTiers')
     // Create multiple products...
     return { site, products }
   }
   ```

### Phase 3: Gradual Test Migration (Weeks 3-4)
**Goal**: Migrate tests incrementally, starting with simple ones

1. **Start with Unit Tests**
   - Begin with `src/components/common/*.test.js`
   - Replace manual mocks with Mirage server

2. **Convert Test Setup Pattern**
   ```javascript
   // Before (current approach)
   const setup = async ({site, member = null}) => {
     const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
     ghostApi.init = jest.fn(() => {
       return Promise.resolve({
         site: deepClone(site),
         member: member ? deepClone(member) : null
       });
     });
     // ... more manual mocks
   }

   // After (with Mirage)
   const setup = ({siteTraits = [], memberTraits = []} = {}) => {
     const site = server.create('site', ...siteTraits)
     const member = memberTraits.length ? server.create('member', ...memberTraits) : null

     const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
     return appRender(<App api={ghostApi} />)
   }
   ```

3. **Update Test Files Gradually**
   - Target 2-3 test files per day
   - Maintain parallel testing (old vs new) initially
   - Focus on flow tests: `SignupFlow.test.js`, `UpgradeFlow.test.js`

### Phase 4: Advanced Features (Week 5)
**Goal**: Implement advanced Mirage features for complex scenarios

1. **Add Request Interception**
   ```javascript
   // Handle dynamic offer scenarios
   this.get('/offers/:id', (schema, request) => {
     const offer = schema.offers.find(request.params.id)
     return offer || new Response(404)
   })
   ```

2. **Implement Server State Management**
   ```javascript
   // Dynamic server state for different test scenarios
   export function setupServerState(server, scenario) {
     switch(scenario) {
       case 'paidMembersOnly':
         server.create('site', { members_signup_access: 'paid' })
         break
       case 'stripeNotConfigured':
         server.create('site', { is_stripe_configured: false })
         break
     }
   }
   ```

3. **Create Scenario Builders**
   ```javascript
   // Test scenario builders
   export const scenarios = {
     freeMemberSingleTier: (server) => {
       const { site } = createSingleTierSite(server)
       const member = server.create('member', 'free')
       return { site, member }
     },

     paidMemberMultiTier: (server) => {
       const { site } = createMultiTierSite(server)
       const member = server.create('member', 'paid')
       return { site, member }
     }
   }
   ```

### Phase 5: Cleanup & Optimization (Week 6)
**Goal**: Remove old code and optimize new setup

1. **Remove Legacy Code**
   - Delete `test-fixtures.js` and `fixtures.js`
   - Remove manual `setupGhostApi` mocks
   - Clean up test utility functions

2. **Performance Optimization**
   - Implement shared server instances where appropriate
   - Add database reset between tests
   - Optimize factory performance

3. **Documentation & Training**
   - Create migration guide for team
   - Document new test patterns
   - Add examples for common scenarios

## Expected Benefits

### Immediate Improvements
- **Reduced Test Code**: 60-70% reduction in test setup boilerplate
- **Faster Test Writing**: New test scenarios in minutes vs hours
- **Better Maintainability**: Central data model definitions
- **Realistic API Responses**: Dynamic data generation vs static fixtures

### Long-term Benefits
- **Scalability**: Easy to add new API endpoints and data relationships
- **Development Experience**: Same server for development and testing
- **Error Scenarios**: Easy to test edge cases and error conditions
- **Team Productivity**: Standardized testing patterns across the codebase

## Migration Example

**Before (Current)**:
```javascript
const setup = async ({site, member = null}) => {
  const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
  ghostApi.init = jest.fn(() => Promise.resolve({
    site: deepClone(site), member: member ? deepClone(member) : null
  }));
  ghostApi.member.sendMagicLink = jest.fn(() => Promise.resolve('success'));
  ghostApi.member.getIntegrityToken = jest.fn(() => Promise.resolve('testtoken'));
  // ... 50+ lines of manual mocking
}
```

**After (With Mirage)**:
```javascript
const setup = ({scenario = 'default'} = {}) => {
  const { site, member } = scenarios[scenario](server)
  const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
  return appRender(<App api={ghostApi} />)
}
```

## Implementation Tracking

- [ ] Phase 1: Foundation Setup
- [ ] Phase 2: Data Modeling & Factories
- [ ] Phase 3: Gradual Test Migration
- [ ] Phase 4: Advanced Features
- [ ] Phase 5: Cleanup & Optimization

---

This migration plan provides a systematic approach to replacing the current awkward test fixtures with a modern, maintainable Mirage JS setup that will significantly improve the testing experience.