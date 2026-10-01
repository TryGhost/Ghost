# Image Transform

Resizes and converts images for Ghost with [sharp](https://sharp.pixelplumbing.com/).
sharp is an optional dependency: without it, `canTransformFiles()` returns
`false` and Ghost stores images without processing them.

This is a private workspace package used by Ghost Core. It is bundled into the
Ghost release artifact and is not published independently.

## Develop

```bash
pnpm nx run @tryghost/image-transform:build
pnpm nx run @tryghost/image-transform:lint
pnpm nx run @tryghost/image-transform:test
```

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE).
