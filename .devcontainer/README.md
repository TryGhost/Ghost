# Dev Container Setup

## devcontainer.json
This file contains the configuration for the dev container. It is used to define the setup of the container, including things like port bindings, environment variables, and other dev container specific features.

There are three main components that the devcontainer.json file relies on:
- The docker compose file (`.devcontainer/compose.yml`), which defines all the services that should be started when the dev container is launched, like MySQL and Redis.
- The Dockerfile (`.docker/Dockerfile`), which is used to build the dev container image.
- The `onCreateCommand` script (`.devcontainer/onCreateCommand.js`), which is used to setup the dev container after it is created.

The Dev Container setup is intended to be as simple as possible with a focus on a really simple setup experience. It is designed to use VSCode's "Clone Repository in Container" feature, which will automatically handle the setup of the dev container, and create a volume for the Ghost codebase that is managed by Docker. It is a great tool for quickly spinning up an isolated development environment, but it lacks some of the flexibility and direct control that a full docker compose setup can provide. Therefore, if you plan to do more "heavy lifting" on Ghost, we recommend using the docker compose setup instead.

## Dockerfile
The Dockerfile used to build the Dev Container itself is located at `.docker/Dockerfile`. This Dockerfile uses a multi-stage build to allow for multiple types of builds without duplicating code and ensuring maximum consistency. The following targets are available:
- `base`: The bare minimum base image used to build and run Ghost. Includes the operating system, node, and some build dependencies, but does not include any Ghost code or dependencies.
- `base-devcontainer`: everything from `base`, plus additional development dependencies like the stripe-cli and playwright. No code or node dependencies.
- `full-devcontainer`: everything from `base-devcontainer`, plus Ghost's code and all node dependencies
- `development`: an alternative to `full-devcontainer` intended for manual development e.g. with docker compose. Add Ghost's code and installs dependencies with some optimizations for the yarn cache

## Docker Compose
The docker compose setup for the dev container is located at `.devcontainer/compose.yml`. This compose file includes the MySQL database service and the Redis service, in addition to the Ghost dev container service. When running the Dev Container (i.e. via the "Clone Repository in Container" feature in VSCode), this compose file will be used to start the necessary services before starting the Ghost Dev Container itself.

## On Create Command
The Dev Container spec allows developers to specify a command to run after the container is created. This is done by specifying an `onCreateCommand` in the devcontainer.json file. For Ghost's Dev Container, this command simply runs a JS script defined in `.devcontainer/onCreateCommand.js`. This script handles installing node dependencies, setting up the local configuration at `ghost/core/config.local.json`, and some other simple setup tasks to get the dev container ready for use.
