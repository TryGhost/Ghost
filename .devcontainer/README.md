# Dev Container Setup

## devcontainer.json
This file contains the configuration for the dev container. It is used to define the setup of the container, including things like port bindings, environment variables, and other dev container specific features.

It points to a docker compose file in the `.devcontainer/.docker` directory, which in turn relies on a Dockerfile in the same directory.

## Dockerfile
The Dockerfile in this directory uses a multi-stage build to allow for multiple types of builds without duplicating code and ensuring maximum consistency. The following targets are available:
- `base`: The bare minimum base image used to build and run Ghost. Includes the operating system, node, and some build dependencies, but does not include any Ghost code or dependencies.
- `base-devcontainer`: everything from `base`, plus additional development dependencies like the stripe-cli and playwright. No code or node dependencies.
- `full-devcontainer`: everything from `base-devcontainer`, plus Ghost's code and all node dependencies
- `development`: an alternative to `full-devcontainer` intended for manual development e.g. with docker compose. Add Ghost's code and installs dependencies with some optimizations for the yarn cache

## Docker Compose
Similarly, the docker compose configuration relies on merging compose files to create the final configuration. The `base.compose.yml` file contains the bare minimum configuration, and can be extended by specifying additional services or modifying the existing ones by supplying additional compose files. For example, to run the `development.compose.yml` file, you would use the following command:

```
docker compose -f .devcontainer/docker/base.compose.yml -f .devcontainer/docker/development.compose.yml up
```

There is an alias `yarn compose` script in the top level `package.json` which points to the appropriate `compose.yml` files for local development.

This setup gives us the flexibility to create multiple different docker compose configurations, while ensuring a base level of consistency across configurations.
