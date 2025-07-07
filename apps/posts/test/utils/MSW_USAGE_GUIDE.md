# MSW Testing Guide - Simplified

Clean, composable mock server setup with just 2 patterns.

## Quick Start

```typescript
import {mockServer, mockData} from '../utils/msw-helpers';

// 90% of cases - just declare what data you want
mockServer.setup({
    posts: [mockData.post({title: 'My Post'})],
    feedback: [{id: '1', score: 1, message: 'Great!'}]
});
```

## The Two Patterns

### Pattern 1: Declarative Data (90% of cases)

Just arrays of data for Ghost API endpoints:

```typescript
mockServer.setup({
    posts: [
        mockData.post({title: 'Post 1'}),
        mockData.post({title: 'Post 2'})
    ],
    feedback: [
        {id: '1', score: 1, message: 'Great!'},
        {id: '2', score: 0, message: 'Needs work'}
    ],
    links: [],  // Empty array = no results
    newsletterBasicStats: [{post_id: 'post-1', open_rate: 0.3}]
});
```

**Available endpoints:**
- `posts` → `/ghost/api/admin/posts/*`
- `feedback` → `/ghost/api/admin/feedback/*`
- `links` → `/ghost/api/admin/links/`
- `newsletterBasicStats` → `/ghost/api/admin/stats/newsletter-basic-stats/`
- `newsletterClickStats` → `/ghost/api/admin/stats/newsletter-click-stats/`

### Pattern 2: Custom Handlers (10% of cases)

For everything complex - errors, external APIs, conditional logic:

```typescript
import {endpoint, when} from '../utils/msw-helpers';

mockServer.setup({
    // Standard data
    posts: [mockData.post()],
    
    // Complex scenarios go in customHandlers
    customHandlers: [
        // External APIs
        endpoint.get('/api/external', {data: 'test'}),
        endpoint.post('/api/webhook', {success: true}, 201),
        
        // Error scenarios  
        endpoint.get('/ghost/api/admin/posts/*', {error: 'Server error'}, 500),
        
        // Conditional responses
        when('get', '/ghost/api/admin/feedback/*', [
            {if: req => req.url.includes('score=1'), response: {feedback: positiveFeedback}},
            {if: req => req.url.includes('score=0'), response: {feedback: negativeFeedback}}
        ], {feedback: []})
    ]
});
```

## Practical Examples

### Basic Hook Testing
```typescript
test('loads post data', () => {
    mockServer.setup({
        posts: [mockData.post({id: 'test-id', title: 'Test Post'})]
    });
    
    const {result} = renderHook(() => usePost('test-id'), {
        wrapper: createTestWrapper()
    });
    
    expect(result.current.data?.title).toBe('Test Post');
});
```

### Error Scenarios
```typescript
test('handles server errors', () => {
    mockServer.setup({
        customHandlers: [
            endpoint.get('/ghost/api/admin/posts/*', {error: 'Server error'}, 500)
        ]
    });
    
    // Test error handling...
});
```

### Complex Component Testing
```typescript
test('PostAnalytics with full data', () => {
    mockServer.setup({
        posts: [mockData.post({
            id: 'post-1',
            count: {clicks: 100, positive_feedback: 5, negative_feedback: 2}
        })],
        feedback: [
            {id: '1', score: 1, message: 'Great!'},
            {id: '2', score: 0, message: 'Needs work'}
        ],
        links: [
            {id: 'link-1', clicks: 50, link: {title: 'Link', to: '/page'}}
        ]
    });
    
    render(<PostAnalytics postId="post-1" />, {wrapper: createTestWrapper()});
    // Assertions...
});
```

### Reusable Test Scenarios
```typescript
// Store scenarios as plain objects
const successScenario = {
    posts: [mockData.post({title: 'Success Post'})],
    feedback: [{id: '1', score: 1, message: 'Good!'}]
};

const errorScenario = {
    customHandlers: [
        endpoint.get('/ghost/api/admin/posts/*', {error: 'Failed'}, 500)
    ]
};

// Reuse across tests
test('success case', () => {
    mockServer.setup(successScenario);
    // Test...
});

test('error case', () => {
    mockServer.setup(errorScenario);
    // Test...
});

// Compose scenarios
test('mixed case', () => {
    mockServer.setup({
        ...successScenario,
        customHandlers: [
            endpoint.get('/api/external', {data: 'external'})
        ]
    });
    // Test...
});
```

## Built-in Defaults

These are automatically included in every test:
- `site` - Basic site info
- `config` - App configuration  
- `settings` - Ghost settings
- `tinybirdToken` - Analytics token

Override if needed:
```typescript
mockServer.setup({
    site: {url: 'https://custom.com', title: 'Custom Site'},
    config: {stats: {enabled: false}}
});
```

## Mock Data Factories

Use `mockData` for consistent test data:

```typescript
// With defaults
mockData.post() // → {id: 'test-post-id', title: 'Test Post', ...}

// With overrides  
mockData.post({title: 'Custom Title', count: {clicks: 999}})

// Direct arrays (when you need simple data)
const posts = [
    {id: '1', title: 'Post 1'},
    {id: '2', title: 'Post 2'}
];
```

## Quick Helper

For PostAnalyticsProvider tests:
```typescript
import {setupPostAnalyticsProvider} from '../utils/msw-helpers';

test('with analytics provider', () => {
    setupPostAnalyticsProvider('my-post-id');
    // Provider will have post data available
});
```