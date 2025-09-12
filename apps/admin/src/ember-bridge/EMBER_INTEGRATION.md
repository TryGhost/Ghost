# Ember Integration System

This system allows you to conditionally show/hide the Ember app based on whether React components that haven't been ported yet are being rendered.

## How it works

1. **EmberProvider**: Provides context to track fallback component presence
2. **EmberRoot**: Renders the Ember app only when fallback components are present
3. **EmberFallback**: A wrapper component that signals when the Ember app should be shown

## Usage

### For routes that haven't been ported to React yet:

```tsx
import EmberFallback from './EmberFallback';

function UnportedRoute() {
    return (
        <EmberFallback>
            <div>This route shows the Ember app</div>
        </EmberFallback>
    );
}
```

### For routes that have been fully ported to React:

```tsx
function PortedRoute() {
    return (
        <div>This route shows only React content, Ember app is hidden</div>
    );
}
```

## Key Features

- **Automatic show/hide**: Ember app is automatically shown when any `EmberFallback` component is mounted
- **Multiple fallbacks**: If multiple `EmberFallback` components are rendered, the Ember app remains visible until all are unmounted
- **DOM preservation**: The Ember app DOM is not destroyed by the router - it's just hidden/shown
- **Error handling**: Proper error boundaries and context validation

## Implementation Details

- The `EmberRoot` component is rendered alongside the router outlet in `App.tsx`
- The `EmberProvider` wraps the entire app to provide context
- Fallback components register/unregister themselves automatically when mounted/unmounted
- The system uses a counter to track how many fallback components are currently active

## Migration Strategy

1. Start with all routes wrapped in `EmberFallback` (showing Ember app)
2. As you port routes to React, remove the `EmberFallback` wrapper
3. The Ember app will automatically hide for ported routes and show for unported ones
