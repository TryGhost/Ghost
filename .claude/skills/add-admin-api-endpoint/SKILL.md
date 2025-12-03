---
name: Add Admin API Endpoint
description: Add a new endpoint or endpoints to Ghost's Admin API at `ghost/api/admin/**`.
---

# Create Admin API Endpoint

## Instructions

1. If creating an endpoint for an entirely new resource, create a new endpoint file in `ghost/core/core/server/api/endpoints/`. Otherwise, locate the existing endpoint file in the same directory.
2. The endpoint file should create a controller object using the JSDoc type from (@tryghost/api-framework).Controller, including at minimum a `docName` and a single endpoint definition, i.e. `browse`. 
3. Add routes for each endpoint to `ghost/core/core/server/web/api/endpoints/admin/routes.js`.
4. Add basic `e2e-api` tests for the endpoint in `ghost/core/test/e2e-api/admin` to ensure the new endpoints function as expected.
5. Run the tests and iterate until they pass: `cd ghost/core && yarn test:single test/e2e-api/admin/{test-file-name}`.

## Reference
For a detailed reference on Ghost's API framework and how to create API controllers, see [reference.md](reference.md).