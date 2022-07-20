# Content / Settings

### routes.yaml

To find out more about `routes.yaml` configuration and how to use it visit [documentation](https://ghost.org/docs/themes/routing/).

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
