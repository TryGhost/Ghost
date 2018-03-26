# Content / Settings

### routes.yaml

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
