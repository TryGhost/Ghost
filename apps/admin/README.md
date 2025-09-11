# Ghost Admin (React)

New React-based Ghost admin interface, gradually replacing the existing Ember admin.

## Architecture

Uses an **Ember Bridge** system for smooth migration:
- Routes ported to React render React components
- Unported routes fall back to the existing Ember admin
- Both share the same UI space seamlessly

## Development

```bash
# Start development server
yarn dev 
```

**Prerequisites:** Ghost and the existing Ember admin must be running on `localhost:2368` for API proxying.
