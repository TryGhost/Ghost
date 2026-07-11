---
name: Shade imports
description: Import Shade from layer-specific subpaths (primitives, components, patterns, page-templates, utils), never the root barrel. Trigger when editing TSX/TS in Shade-consuming apps.
autoTrigger:
  - fileEdit: "apps/{shade,admin,admin-x-settings,admin-x-framework,posts,stats,activitypub}/**/*.{ts,tsx}"
---

# Shade imports

Always import Shade from its **layer-specific subpath**. Never from the root barrel `@tryghost/shade`.

## Correct

```ts
import {Stack, Inline, Box, Grid, Container, Text} from '@tryghost/shade/primitives';
import {Button, Input, Dialog} from '@tryghost/shade/components';
import {PageHeader, KpiCard, Filters} from '@tryghost/shade/patterns';
import {ListPage} from '@tryghost/shade/page-templates';
import {PostShareModal} from '@tryghost/shade/posts-stats';
import {cn, formatNumber} from '@tryghost/shade/utils';
import {ShadeApp} from '@tryghost/shade/app';
```

**Note:** `ListPage` is in `@tryghost/shade/page-templates`, not `/patterns`. Page templates are top-level page wrappers; patterns are the building blocks they compose.

## Incorrect

```ts
// BAD — root barrel
import {Button, Stack} from '@tryghost/shade';

// BAD — deep path into source
import {Button} from '@tryghost/shade/src/components/ui/button';
```

## Inside Shade itself

When editing files under `apps/shade/src/**`, use the `@/` alias for cross-file imports:

```ts
import {cn} from '@/lib/utils';
import {inputSurface} from '@/components/ui/input-surface';
```

## Why

Subpath imports make the layer (primitive/component/pattern) visible at the call site, which is the first piece of information a reader needs. The root barrel hides that and encourages cross-layer drift.
