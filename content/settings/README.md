# Content / Settings

### routes.yaml

<!-- TODO: make a better description here and link to the docs -->

This is how the default `routes.yaml` file looks like:

```yaml
routes:

collections:
  /:
    route: '{globals.permalinks}'
    template:
      - home
      - index

resources:
  tag: /tag/{slug}/
  author: /author/{slug}/
```
