# Docker Setup

## Dockerfile
The Dockerfile in this directory uses a multi-stage build to allow for multiple types of builds without duplicating code and ensuring maximum consistency. The following targets are available:
- `base`: The bare minimum base image used to build and run Ghost. Includes the operating system, node, and some build dependencies, but does not include any Ghost code or dependencies.

## Docker Compose
Similarly, the docker compose configuration relies on merging compose files to create the final configuration. The `base.compose.yml` file contains the bare minimum configuration, and can be extended by specifying additional services or modifying the existing ones by supplying additional compose files. For example, to run the `development.compose.yml` file, you would use the following command:

```
yarn compose -f .devcontainer/docker/base.compose.yml -f .devcontainer/docker/development.compose.yml up
```

This gives us the flexibility to create multiple different docker compose environments, while ensuring a base level of consistency across configurations.