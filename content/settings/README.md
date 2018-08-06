# Content / Settings

### routes.yaml

<!-- TODO: make a better description here and link to the docs -->

This is how the default `routes.yaml` file looks like:

```yaml
routes:

collections:
  /:
    permalink: '/{slug}/'
    template:
      - index

taxonomies:
  tag: /tag/{slug}/
  author: /author/{slug}/
```
