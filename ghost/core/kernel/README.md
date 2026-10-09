# Kernel

The kernel contains application-independent framework primitives. It has no
knowledge of Ghost's features, domain models, business rules or configuration.

Application code depends on the kernel; the kernel does not depend on application
code. Kernel modules may use one another and general-purpose dependencies, but
must not import from elsewhere in the Ghost package, including `shared`.

Helpers specific to a feature stay with that feature. Shared use alone does not
make a helper part of the kernel.

## Service initialization

[`defineService(name, create)`](define-service.ts) gives a service root `init()`
and a `.service` getter. Boot calls `init()` in the appropriate startup phase. The
factory constructs and returns a ready instance, awaiting any required startup
work first. The factory must not recursively initialize its own root.

Concurrent initialization shares one attempt. Successful initialization retains
the same instance; failure preserves the error and permits a later explicit
retry. Reading `.service` throws until initialization completes. The factory owns
cleanup of any partial startup work. Shutdown and background job registration
remain with their existing owners.
