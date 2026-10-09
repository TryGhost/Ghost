# Ghost kernel

The kernel contains framework mechanisms for constructing and running Ghost,
without feature-specific business rules. It sits alongside `server`, `frontend`
and `shared` because these mechanisms support the application as a whole.

Kernel code must not import `server`, `frontend` or application entry points.
Boot assembles the application and supplies the concrete capabilities. General
helpers stay in libraries; helpers specific to a service stay with that service.

## Service initialization

[`defineService(name, create)`](define-service.ts) gives a service root `init()`
and `getInstance()`. Boot calls `init()` in the appropriate startup phase. The
factory constructs and returns a ready instance, awaiting any required startup
work first. The factory must not recursively initialize its own root.

Concurrent initialization shares one attempt. Successful initialization retains
the same instance; failure preserves the error and permits a later explicit
retry. `getInstance()` throws until initialization completes. The factory owns
cleanup of any partial startup work. Shutdown and background job registration
remain with their existing owners.
