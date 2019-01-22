## Acceptance Tests

This folder should only contain a set of basic API use cases.

We are currently refactoring the test env. The "old" folder currently contains all API tests for the 
stable API version (v2). The goal is:

- either keep a test if it's a basic use case e.g. upload an image, schedule a post, download a theme
- otherwise move the test to regression api v2 tests

We probably need a differentiation for the acceptance tests for session and api_key authentication.

Before we move tests:

- we have to re-work how are test utility is structured
- we have to reduce tests
